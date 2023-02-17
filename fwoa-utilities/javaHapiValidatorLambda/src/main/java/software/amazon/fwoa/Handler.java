/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import com.amazonaws.util.IOUtils;

import software.amazon.fwoa.IGUtils.IGObject;
import software.amazon.fwoa.IGUtils.*;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class Handler implements RequestHandler<String, ValidatorResponse> {

    private final Validator validator;
    private static final AmazonS3 s3 = AmazonS3ClientBuilder.standard().build();
    private String bucketName = System.getenv("IMPLEMENTATION_GUIDES_BUCKET");

    public Handler() {
        log.info("Creating the Validator instance for the first time...");

        String fhirVersion = System.getenv("FHIR_VERSION");
        if (fhirVersion == null) {
            fhirVersion = Validator.FHIR_R4;
        }
        if (bucketName == null) {
            throw new Error("Implementation Guides Bucket not found!");
        }
        List<String> objectKeys = getBucketObjects(bucketName);
        Map<String, List<IGObject>> igObjects = downloadObjects(objectKeys, bucketName);
        validator = new Validator(fhirVersion, igObjects.get("indices"), igObjects.get("resources"));

        log.info("Validating once to force the loading of all the validator related classes");
        // Validating a complex Patient yields better results. validating a trivial
        // "empty" Patient won't load all the validation classes.
        validator.validate(IGUtils.someSyntheaPatient);
        log.info("Validator is ready");
    }

    @Override
    public ValidatorResponse handleRequest(String event, Context context) {
        ValidatorResponse validate = validator.validate(event);
        return validate;

    }

    private List<String> getBucketObjects(String bucketName) {
        try {
            List<String> objectKeys = new ArrayList<String>();
            ListObjectsV2Request req = new ListObjectsV2Request().withBucketName(bucketName);
            ListObjectsV2Result result;
            do {
                result = s3.listObjectsV2(req);

                for (S3ObjectSummary objectSummary : result.getObjectSummaries()) {
                    objectKeys.add(objectSummary.getKey());
                }
                // If there are more than maxKeys keys in the bucket, get a continuation token
                // and list the next objects.
                String token = result.getNextContinuationToken();
                req.setContinuationToken(token);
            } while (result.isTruncated());
            log.info("found " + objectKeys.size() + " keys");
            return objectKeys;
        } catch (Exception e) {
            throw new Error(e);
        }
    }

    private Map<String, List<IGObject>> downloadObjects(List<String> keys, String bucketName) {
        // keep track of .index.json objects
        List<IGObject> indices = new ArrayList<IGObject>();
        List<IGObject> resources = new ArrayList<IGObject>();
        for (String key : keys) {
            try (S3ObjectInputStream s3Object = s3.getObject(bucketName, key).getObjectContent()) {
                IGObject bucketObj = new IGUtils.IGObject(key, IOUtils.toString(s3Object));
                if (key.contains(".index.json")) {
                    indices.add(bucketObj);
                } else {
                    resources.add(bucketObj);
                }
            } catch (Exception e) {
                log.error(e.toString());
                throw new Error(e.getMessage());
            }
        }
        log.info("finished downloading all object content into memory");
        Map<String, List<IGObject>> downloadGuidesHolder = new HashMap<String, List<IGObject>>();
        downloadGuidesHolder.put("indices", indices);
        downloadGuidesHolder.put("resources", resources);
        return downloadGuidesHolder;
    }
}
