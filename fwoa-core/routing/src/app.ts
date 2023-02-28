/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import {
  cleanAuthHeader,
  getRequestInformation,
  ConfigVersion,
  TypeOperation,
  FhirConfig,
  SmartStrategy,
  RequestContext,
  VerbType
} from '@aws/fhir-works-on-aws-interface';
import cors, { CorsOptions } from 'cors';
import express, { Express } from 'express';
import ConfigHandler from './configHandler';
import { initializeOperationRegistry } from './operationDefinitions';
import { FHIRStructureDefinitionRegistry } from './registry';
import ResourceHandler from './router/handlers/resourceHandler';
import { setContentTypeMiddleware } from './router/middlewares/setContentType';
import { setLoggerMiddleware } from './router/middlewares/setLogger';
import { setServerUrlMiddleware } from './router/middlewares/setServerUrl';
import { setTenantIdMiddleware } from './router/middlewares/setTenantId';
import { applicationErrorMapper, httpErrorHandler, unknownErrorHandler } from './router/routes/errorHandling';
import ExportRoute from './router/routes/exportRoute';
import GenericResourceRoute from './router/routes/genericResourceRoute';
import MetadataRoute from './router/routes/metadataRoute';
import RootRoute from './router/routes/rootRoute';
import WellKnownUriRouteRoute from './router/routes/wellKnownUriRoute';

const configVersionSupported: ConfigVersion = 1;

function prepareRequestContext(req: express.Request): RequestContext {
  const requestContext: RequestContext = {
    headers: req.headers,
    hostname: req.hostname,
    url: req.url,
    contextInfo: {}
  };

  if (req.method) {
    const method = req.method.toUpperCase();
    if (['CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'].includes(method)) {
      requestContext.verb = method as VerbType;
    }
  }
  return requestContext;
}

export function generateServerlessRouter(
  fhirConfig: FhirConfig,
  supportedGenericResources: string[],
  corsOptions?: CorsOptions
): Express {
  if (configVersionSupported !== fhirConfig.configVersion) {
    throw new Error(`This router does not support ${fhirConfig.configVersion} version`);
  }
  const configHandler: ConfigHandler = new ConfigHandler(fhirConfig, supportedGenericResources);
  const { fhirVersion, genericResource, compiledImplementationGuides } = fhirConfig.profile;
  const serverUrl: string = fhirConfig.server.url;
  let hasCORSEnabled: boolean = false;
  const registry = new FHIRStructureDefinitionRegistry(compiledImplementationGuides);
  const operationRegistry = initializeOperationRegistry(configHandler);

  const app = express();
  app.disable('x-powered-by');

  const mainRouter = express.Router({ mergeParams: true });

  mainRouter.use(express.urlencoded({ extended: true }));
  mainRouter.use(
    express.json({
      type: ['application/json', 'application/fhir+json', 'application/json-patch+json'],
      // 6MB is the maximum payload that Lambda accepts
      limit: '6mb'
    })
  );
  // Add cors handler before auth to allow pre-flight requests without auth.
  if (corsOptions) {
    mainRouter.use(cors(corsOptions));
    hasCORSEnabled = true;
  }

  mainRouter.use(setServerUrlMiddleware(fhirConfig));
  mainRouter.use(setContentTypeMiddleware);

  // Metadata
  const metadataRoute: MetadataRoute = new MetadataRoute(
    fhirVersion,
    configHandler,
    registry,
    operationRegistry,
    hasCORSEnabled
  );
  mainRouter.use('/metadata', metadataRoute.router);

  if (fhirConfig.auth.strategy.service === 'SMART-on-FHIR') {
    // well-known URI http://www.hl7.org/fhir/smart-app-launch/conformance/index.html#using-well-known
    const smartStrat: SmartStrategy = fhirConfig.auth.strategy.oauthPolicy as SmartStrategy;
    if (smartStrat.capabilities) {
      const wellKnownUriRoute = new WellKnownUriRouteRoute(smartStrat);
      mainRouter.use('/.well-known/smart-configuration', wellKnownUriRoute.router);
    }
  }

  // AuthZ
  mainRouter.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const requestInformation =
        operationRegistry.getOperation(req.method, req.path)?.requestInformation ??
        getRequestInformation(req.method, req.path);
      // Clean auth header (remove 'Bearer ')
      req.headers.authorization = cleanAuthHeader(req.headers.authorization);
      res.locals.requestContext = prepareRequestContext(req);
      // eslint-disable-next-line require-atomic-updates
      res.locals.userIdentity = await fhirConfig.auth.authorization.verifyAccessToken({
        ...requestInformation,
        requestContext: res.locals.requestContext,
        accessToken: req.headers.authorization,
        fhirServiceBaseUrl: res.locals.serverUrl
      });
      next();
    } catch (e) {
      next(e);
    }
  });

  if (process.env.ENABLE_SECURITY_LOGGING === 'true') {
    mainRouter.use(setLoggerMiddleware);
  }

  if (fhirConfig.multiTenancyConfig?.enableMultiTenancy) {
    mainRouter.use(setTenantIdMiddleware(fhirConfig));
  }

  // Export
  if (fhirConfig.profile.bulkDataAccess) {
    const exportRoute = new ExportRoute(
      fhirConfig.profile.bulkDataAccess,
      fhirConfig.auth.authorization,
      fhirConfig.profile.fhirVersion
    );
    mainRouter.use('/', exportRoute.router);
  }

  // Operations defined by OperationDefinition resources
  operationRegistry.getAllRouters().forEach((router) => {
    mainRouter.use('/', router);
  });

  // Special Resources
  if (fhirConfig.profile.resources) {
    Object.entries(fhirConfig.profile.resources).forEach(async (resourceEntry) => {
      const { operations, persistence, typeSearch, typeHistory, fhirVersions } = resourceEntry[1];
      if (fhirVersions.includes(fhirVersion)) {
        const resourceHandler: ResourceHandler = new ResourceHandler(
          persistence,
          typeSearch,
          typeHistory,
          fhirConfig.auth.authorization,
          serverUrl,
          fhirConfig.validators
        );

        const route: GenericResourceRoute = new GenericResourceRoute(
          operations,
          resourceHandler,
          fhirConfig.auth.authorization
        );
        mainRouter.use(`/:resourceType(${resourceEntry[0]})`, route.router);
      }
    });
  }

  // Generic Resource Support
  // Make a list of resources to make
  const genericFhirResources: string[] = configHandler.getGenericResources(fhirVersion);
  if (genericResource && genericResource.fhirVersions.includes(fhirVersion)) {
    const genericOperations: TypeOperation[] = configHandler.getGenericOperations(fhirVersion);

    const genericResourceHandler: ResourceHandler = new ResourceHandler(
      genericResource.persistence,
      genericResource.typeSearch,
      genericResource.typeHistory,
      fhirConfig.auth.authorization,
      serverUrl,
      fhirConfig.validators
    );

    const genericRoute: GenericResourceRoute = new GenericResourceRoute(
      genericOperations,
      genericResourceHandler,
      fhirConfig.auth.authorization
    );

    // Set up Resource for each generic resource
    genericFhirResources.forEach(async (resourceType: string) => {
      mainRouter.use(`/:resourceType(${resourceType})`, genericRoute.router);
    });
  }

  // Root Post (Bundle/Global Search)
  if (fhirConfig.profile.systemOperations.length > 0) {
    const rootRoute = new RootRoute(
      fhirConfig.profile.systemOperations,
      fhirConfig.validators,
      serverUrl,
      fhirConfig.profile.bundle,
      fhirConfig.profile.systemSearch,
      fhirConfig.profile.systemHistory,
      fhirConfig.auth.authorization,
      genericFhirResources,
      genericResource,
      fhirConfig.profile.resources
    );
    mainRouter.use('/', rootRoute.router);
  }

  mainRouter.use(applicationErrorMapper);
  mainRouter.use(httpErrorHandler);
  mainRouter.use(unknownErrorHandler);

  if (
    fhirConfig.multiTenancyConfig?.enableMultiTenancy &&
    fhirConfig.multiTenancyConfig?.useTenantSpecificUrl
  ) {
    app.use('/tenant/:tenantIdFromPath([a-zA-Z0-9\\-_]{1,64})', mainRouter);
  } else {
    app.use('/', mainRouter);
  }

  return app;
}
