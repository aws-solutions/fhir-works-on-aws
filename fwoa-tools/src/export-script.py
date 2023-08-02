"""
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
"""
"""
To allow customers to download data from DDB, we first export the data to S3. Once the files are in S3, users can
download the S3 files by being being provided signed S3 urls.type_list
This is a Glue script (https://aws.amazon.com/glue/). This script is uploaded to a private S3 bucket, and provided
to the export Glue job. The Glue job runs this script to export data from DDB to S3.
"""

import sys
import boto3
import re
import json
import threading
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.conf import SparkConf
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from datetime import datetime
from boto3.dynamodb.types import TypeDeserializer
conf = SparkConf()
conf.set("spark.sql.files.maxPartitionBytes", 5368709120)  # 5 GB in bytes
spark = SparkContext.getOrCreate(conf=conf)
glueContext = GlueContext(spark)
job = Job(glueContext)

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'jobId', 'jobOwnerId', 'exportType', 'transactionTime',
                          'since', 'outputFormat', 'ddbTableName', 'workerType', 'numberWorkers', 's3OutputBucket'])

# type and tenantId are optional parameters
type = None
if ('--{}'.format('type') in sys.argv):
    type = getResolvedOptions(sys.argv, ['type'])['type']
groupId = None
if ('--{}'.format('groupId') in sys.argv):
    groupId = getResolvedOptions(sys.argv, ['groupId'])['groupId']
tenantId = None
if ('--{}'.format('tenantId') in sys.argv):
    tenantId = getResolvedOptions(sys.argv, ['tenantId'])['tenantId']
exportDeletedResources = True
if ('--{}'.format('exportDeletedResources') in sys.argv):
    exportDeletedResources = getResolvedOptions(sys.argv, ['exportDeletedResources'])[
        'exportDeletedResources'] == 'true'
snapshotExists = False
snapshotLocation = None
if ('--{}'.format('snapshotExists') in sys.argv):
    snapshotExists = getResolvedOptions(sys.argv, ['snapshotExists'])[
        'snapshotExists'] == 'true'
if (snapshotExists):
    snapshotLocation = getResolvedOptions(sys.argv, ['snapshotLocation'])[
        'snapshotLocation']

job_id = args['jobId']
job_owner_id = args['jobOwnerId']
export_type = args['exportType']
transaction_time = args['transactionTime']
since = args['since']
outputFormat = args['outputFormat']
ddb_table_name = args['ddbTableName']
worker_type = args['workerType']
number_workers = args['numberWorkers']

bucket_name = args['s3OutputBucket']

table_export_start_time = datetime.now()
print("Starting Table Export Time =",
      table_export_start_time.strftime("%H:%M:%S"))
original_data_source_dyn_frame = None

time_format_str = "%Y-%m-%dT%H:%M:%S.%fZ"
max_folder_size_bytes = 536870912000 # 500 GB in Bytes

if (snapshotExists and snapshotLocation is not None):
    original_data_source_dyn_frame = glueContext.create_dynamic_frame.from_options(
        connection_type="s3",
        connection_options={
            "paths": [snapshotLocation],
            "recurse": True
        },
        format="json"
    )
else:
    ddb_client = boto3.client('dynamodb')
    ddb_table_response = ddb_client.describe_table(
        TableName=ddb_table_name
    )
    ddb_table_arn = ddb_table_response['Table']['TableArn']

    original_data_source_dyn_frame = glueContext.create_dynamic_frame.from_options(
        connection_type="dynamodb",
        connection_options={
            "dynamodb.tableArn": ddb_table_arn,
            "dynamodb.export": "ddb",
            "dynamodb.s3.bucket": bucket_name,
            "dynamodb.s3.prefix": f"FWoAGlueJobOutput/{job_id}/"
        }
    )
table_export_finish_time = datetime.now()
print('Finished Table Export Time =',
      table_export_finish_time.strftime("%H:%M:%S"))
print('Table export duration = ', table_export_finish_time - table_export_start_time)


def dynamo_obj_to_python_obj(dynamo_obj: dict) -> dict:
    deserializer = TypeDeserializer()
    return {
        k: deserializer.deserialize(v)
        for k, v in dynamo_obj.items()
    }


def transform_dyn_frame_from_dynamo_obj_to_python_obj(rec):
    # Convert the record to a dictionary
    item = rec.Item
    # convert to serialized json
    json_str = json.dumps(item)
    # convert to python dictionary object
    json_dict = json.loads(json_str)
    # convert dynamodb json to proper json
    transformedJson = dynamo_obj_to_python_obj(json_dict)
    return transformedJson


transform_start_time = datetime.now()
original_data_source_dyn_frame = original_data_source_dyn_frame.map(
    f=transform_dyn_frame_from_dynamo_obj_to_python_obj)
transform_finish_time = datetime.now()
print('Transform Dynamo Obj to Python Obj duration = ', transform_finish_time - transform_start_time)

print('Start filtering by tenantId')


def remove_composite_id(resource):
    # Replace the multi-tenant composite id with the original resource id found at "_id"
    resource["id"] = resource["_id"]
    return resource


# Filter by tenantId
tenant_id_filter_start_time = datetime.now()
if (tenantId is None):
    filtered_tenant_id_frame = original_data_source_dyn_frame
else:
    filtered_tenant_id_frame_with_composite_id = original_data_source_dyn_frame.filter(
        f=lambda x: x['_tenantId'] == tenantId
    )

    filtered_tenant_id_frame = filtered_tenant_id_frame_with_composite_id.map(
        f=remove_composite_id)

tenant_id_filter_finish_time = datetime.now()
print('Elapsed time for tenantId Filtering = ',
      tenant_id_filter_finish_time - tenant_id_filter_start_time)
print('start filtering by group_id')

datetime_transaction_time = datetime.strptime(
    transaction_time, time_format_str)

print('Start filtering by transactionTime and Since')
time_filter_start_time = datetime.now()
# Filter by transactionTime and Since
datetime_since = datetime.strptime(since, time_format_str)
filtered_dates_dyn_frame = filtered_tenant_id_frame.filter(
    f=lambda x:
    datetime.strptime(x["meta"]["lastUpdated"], time_format_str) > datetime_since and
    datetime.strptime(x["meta"]["lastUpdated"],
                      time_format_str) <= datetime_transaction_time
)

time_filter_finish_time = datetime.now()
print('Elapsed time for transactionTime and Since filtering = ',
      time_filter_finish_time - time_filter_start_time)

print('Start filtering by documentStatus and resourceType')
type_filter_start_time = datetime.now()
# Filter by resource listed in Type and with correct STATUS
type_list = None if type == None else set(type.split(','))
valid_document_state_to_be_read_from = {
    'AVAILABLE', 'LOCKED', 'PENDING_DELETE'}
if (exportDeletedResources):
    valid_document_state_to_be_read_from = {
        'AVAILABLE', 'LOCKED', 'PENDING_DELETE', 'DELETED'}

filtered_dates_resource_dyn_frame = filtered_dates_dyn_frame.filter(
    f=lambda x:
    x["documentStatus"] in valid_document_state_to_be_read_from if type_list is None
    else x["documentStatus"] in valid_document_state_to_be_read_from and x["resourceType"] in type_list
)

type_filter_finish_time = datetime.now()
print('Elapsed time for documentStatus and resourceType filtering = ',
      type_filter_finish_time - type_filter_start_time)


def add_resource_tags(record):
    record["meta"]["tag"] = []
    record["meta"]["tag"].append(
        {"display": record["meta"]["lastUpdated"], "code": "originalLastUpdated"})
    if record["documentStatus"] == "DELETED":
        record["meta"]["tag"].append({"display": "DELETED", "code": "DELETED"})
    return record


def additional_transformations(record):
    # Add additional customizations as needed here
    return record

additional_mapping_start_time = datetime.now()

filtered_dates_resource_dyn_frame = filtered_dates_resource_dyn_frame.map(
    add_resource_tags)
filtered_dates_resource_dyn_frame = filtered_dates_resource_dyn_frame.map(
    additional_transformations)

additional_mapping_finish_time = datetime.now()
print('Elapsed time for adding resource tags = ',
      additional_mapping_finish_time - additional_mapping_start_time)

# Drop fields that are not needed
print('Dropping fields that are not needed')
drop_fields_start_time = datetime.now()
data_source_cleaned_dyn_frame = filtered_dates_resource_dyn_frame.drop_fields(
    paths=['documentStatus', 'lockEndTs', 'vid', '_references', '_tenantId', '_id', '_subscriptionStatus'])

drop_fields_finish_time = datetime.now()
print('Elapsed time for dropping fields = ',
      drop_fields_finish_time - drop_fields_start_time)


def add_dup_resource_type(record):
    record["partitionKeyDup"] = record["resourceType"] + "-v" + record["meta"]["versionId"]
    return record


# Create duplicated column so we can use it in partitionKey later
partition_column_add_start_time = datetime.now()
data_source_cleaned_dyn_frame = data_source_cleaned_dyn_frame.map(
    add_dup_resource_type)
partition_column_add_finish_time = datetime.now()
print('Elapsed time for adding partitionkey column = ',
      partition_column_add_finish_time - partition_column_add_start_time)

if data_source_cleaned_dyn_frame.count() == 0:
    print('No resources within requested parameters to export')
else:
    print('Writing data to S3')
    table_export_start_time = datetime.now()
    # Export data to S3 split by resourceType
    glueContext.write_dynamic_frame.from_options(
        frame=data_source_cleaned_dyn_frame,
        connection_type="s3",
        connection_options={
            "path": "s3://" + bucket_name + "/" + job_id,
            "partitionKeys": ["partitionKeyDup"],
        },
        format="json"
    )
    table_export_finish_time = datetime.now()
    print('Elapsed time for dataframe writing = ',
          table_export_finish_time - table_export_start_time)

    # Rename exported files into ndjson files
    print('Renaming files')
    client = boto3.client('s3')

    def iterate_bucket_items(bucket, prefix):
        """
        Generator that iterates over all objects in a given s3 bucket

        See http://boto3.readthedocs.io/en/latest/reference/services/s3.html#S3.Client.list_objects_v2 
        for return data format
        :param bucket: name of s3 bucket
        :return: dict of metadata for an object
        """

        paginator = client.get_paginator('list_objects_v2')
        parameters = {'Bucket': bucket, 'Prefix': prefix}
        page_iterator = paginator.paginate(**parameters)

        for page in page_iterator:
            if page['KeyCount'] > 0:
                for item in page['Contents']:
                    yield item

    resulting_file_names = {}
    folder_sizes = {}
    current_version_aliases = {}
    regex_pattern = '\/partitionKeyDup=(\w+-v\d+)\/run-\d{13}-part-r-(\d{5})$'

    def rename_files(s3_file_names):
        for s3_file_name in s3_file_names:
            copy_source = {
                'Bucket': bucket_name,
                'Key': s3_file_name['file_name']
            }

            extra_args = {
                'ContentType': 'application/fhir+ndjson',
                'Metadata': {
                    'job-owner-id': job_owner_id
                },
                'MetadataDirective': 'REPLACE'
            }
            client.copy(copy_source, bucket_name,
                        s3_file_name['renamed_file_name'], ExtraArgs=extra_args)
            client.delete_object(Bucket=bucket_name, Key=s3_file_name['file_name'])

    number_of_threads = 6
    list_of_file_names = []

    for thread_counter in range(number_of_threads):
        list_of_file_names.append([])

    count = 0
    for item in iterate_bucket_items(bucket_name, job_id):
        file_name = item['Key']
        match = re.search(regex_pattern, file_name)
        if match is None:
            continue
        else:
            resource_type_name = match.group(1)
            version_num = match.group(1).split('-')[1]
            item_size = item["Size"]
            version_num_alias = version_num
            if (version_num not in current_version_aliases):
                current_version_aliases[version_num] = 0
            version_num_alias = version_num + "-" + str(current_version_aliases[version_num])
            if resource_type_name.startswith("Binary"):
                version_num_alias = resource_type_name

            if (version_num_alias not in folder_sizes):
                folder_sizes[version_num_alias] = {"object_count": 0, "total_size": 0}
            # Check for 500 GB size limit or 10000 object count limit in folder
            if (folder_sizes[version_num_alias]["object_count"] >= 10000 or folder_sizes[version_num_alias]["total_size"] + item_size >= max_folder_size_bytes):
                current_version_aliases[version_num] += 1
                version_num_alias = version_num + "-" + str(current_version_aliases[version_num])
                folder_sizes[version_num_alias] = {"object_count": 0, "total_size": 0}

            folder_sizes[version_num_alias]["object_count"] += 1
            folder_sizes[version_num_alias]["total_size"] += item_size

            new_s3_file_name = version_num_alias + "/" + resource_type_name + "-" + match.group(2) + ".ndjson"
            tenant_specific_path = '' if (tenantId is None) else tenantId + '/'
            new_s3_file_path = tenant_specific_path + job_id + '/' + new_s3_file_name
            if version_num_alias not in resulting_file_names:
                resulting_file_names[version_num_alias] = []
            resulting_file_names[version_num_alias].append(new_s3_file_path)

            list_of_file_names[count % number_of_threads].append({
                "file_name": file_name,
                "renamed_file_name": new_s3_file_path
            })
        count = count + 1

    rename_file_start_time = datetime.now()
    threads = []
    # Start executing threads
    for thread_counter in range(number_of_threads):
        thread = threading.Thread(target=rename_files, args=(
            list_of_file_names[thread_counter % number_of_threads],))
        thread.start()
        threads.append(thread)

    # Wait till threads finish executing
    for thread_counter in range(number_of_threads):
        threads[thread_counter % number_of_threads].join()
    
    # write the file_names to S3
    migration_output_file_data = json.dumps({
        "jobId": job_id,
        "file_names": resulting_file_names
    })
    tenant_prefix = "" if tenantId is None else f"{tenantId}/"
    client.put_object(Body=migration_output_file_data, Bucket=bucket_name, Key=f"{tenant_prefix}{job_id}/migration_output.json")

    rename_file_finish_time = datetime.now()
    print('Elapsed time for renaming files with ' + str(number_of_threads) +
          ' threads = ', rename_file_finish_time - rename_file_start_time)
    print('Export job finished')
