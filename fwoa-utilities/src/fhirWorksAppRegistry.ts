/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import * as appreg from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { SharePermission } from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { Aws, CfnMapping, CfnOutput, Fn, RemovalPolicy, Stack, Tags } from 'aws-cdk-lib';
import { CfnApplication } from 'aws-cdk-lib/aws-applicationinsights';
import { Construct, IConstruct } from 'constructs';

/**
 * @param resource - Construct
 * @param key - tag key
 * @param value - tag value
 */
export function applyTag(resource: IConstruct, key: string, value: string): void {
  Tags.of(resource).add(key, value);
}

export function createAppInsightsConfiguration(stack: Stack): void {
  // eslint-disable-next-line no-new
  new CfnApplication(stack, `ApplicationInsightsConfiguration-${stack.node.id}`, {
    resourceGroupName: Fn.join('-', ['AWS_CloudFormation_Stack', stack.stackName]),
    autoConfigurationEnabled: true,
    cweMonitorEnabled: true,
    opsCenterEnabled: true
  });
}
export interface FhirWorksAppRegistryProps {
  solutionId: string;
  solutionName: string;
  solutionVersion: string;
  appRegistryApplicationName: string;
  applicationType: string;
  attributeGroupName: string;
  accountIds?: string[];
  destroy?: boolean;
  appInsights?: boolean;
}

export class FhirWorksAppRegistry extends Construct {
  private _solutionId: string;
  private _solutionName: string;
  private _solutionVersion: string;
  private _appRegistryApplicationName: string;
  private _applicationType: string;
  private _attributeGroupName: string;
  private _accountIds: string[];
  private _destroy: boolean;
  private _appInsights: boolean;
  private readonly _registryApplication: appreg.Application;
  private readonly _appRegMap: CfnMapping;

  public constructor(scope: Construct, id: string, props: FhirWorksAppRegistryProps) {
    super(scope, id);
    const stack: Stack = scope as Stack;
    this._solutionId = props.solutionId;
    this._appRegistryApplicationName = props.appRegistryApplicationName;
    this._solutionName = props.solutionName;
    this._applicationType = props.applicationType;
    this._solutionVersion = props.solutionVersion;
    this._attributeGroupName = props.attributeGroupName;
    this._accountIds = props.accountIds ? props.accountIds : [];
    this._destroy = props.destroy ? props.destroy : false;
    this._appInsights = props.appInsights ? props.appInsights : false;
    this._appRegMap = this._createMap(stack, id);
    this._registryApplication = this._createAppRegistry(stack, id);
    this._applyTagsToApplication();
  }

  public applyAppRegistryToStacks(resourceStacks: Stack[], appInsights: boolean): void {
    resourceStacks.forEach((resourceStack) => {
      this._registryApplication.associateApplicationWithStack(resourceStack);
      if (appInsights) {
        createAppInsightsConfiguration(resourceStack);
      }
    });
  }

  private _createAppRegistry(stack: Stack, id: string): appreg.Application {
    const application = new appreg.Application(stack, `${id}-Application`, {
      applicationName: Fn.join('-', [
        this._appRegMap.findInMap('Data', 'AppRegistryApplicationName'),
        Aws.REGION,
        Aws.ACCOUNT_ID
      ]),
      description: `Service Catalog application to track and manage all your resources for the solution ${this._solutionName}`
    });

    if (this._destroy) {
      application.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }

    if (this._accountIds.length > 0) {
      application.shareApplication({
        accounts: this._accountIds,
        sharePermission: SharePermission.ALLOW_ACCESS
      });
    }
    application.associateApplicationWithStack(stack);

    const attributeGroup = new appreg.AttributeGroup(stack, `${id}-AttributeGroup`, {
      attributeGroupName: this._appRegMap.findInMap('Data', 'AttributeGroupName'),
      description: 'Attribute group for solution information',
      attributes: {
        applicationType: this._appRegMap.findInMap('Data', 'ApplicationType'),
        version: this._appRegMap.findInMap('Data', 'Version'),
        solutionID: this._appRegMap.findInMap('Data', 'ID'),
        solutionName: this._appRegMap.findInMap('Data', 'SolutionName')
      }
    });

    if (this._destroy) {
      attributeGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }

    if (this._accountIds.length > 0) {
      attributeGroup.shareAttributeGroup({
        accounts: this._accountIds,
        sharePermission: SharePermission.ALLOW_ACCESS
      });
    }

    application.associateAttributeGroup(attributeGroup);

    if (this._appInsights) {
      createAppInsightsConfiguration(stack);
    }

    // eslint-disable-next-line no-new
    new CfnOutput(this, `${id}-AppRegistryApplicationArn`, {
      value: application.applicationArn
    });

    return application;
  }

  private _createMap(stack: Stack, id: string): CfnMapping {
    const map = new CfnMapping(stack, `${id}-Solution`);
    map.setValue('Data', 'ID', this._solutionId);
    map.setValue('Data', 'Version', this._solutionVersion);
    map.setValue('Data', 'AppRegistryApplicationName', this._appRegistryApplicationName);
    map.setValue('Data', 'SolutionName', this._solutionName);
    map.setValue('Data', 'ApplicationType', this._applicationType);
    map.setValue('Data', 'AttributeGroupName', this._attributeGroupName);

    return map;
  }

  private _applyTagsToApplication(): void {
    applyTag(this._registryApplication, 'Solutions:SolutionID', this._appRegMap.findInMap('Data', 'ID'));
    applyTag(
      this._registryApplication,
      'Solutions:SolutionName',
      this._appRegMap.findInMap('Data', 'SolutionName')
    );
    applyTag(
      this._registryApplication,
      'Solutions:SolutionVersion',
      this._appRegMap.findInMap('Data', 'Version')
    );
    applyTag(
      this._registryApplication,
      'Solutions:ApplicationType',
      this._appRegMap.findInMap('Data', 'ApplicationType')
    );
  }
}
