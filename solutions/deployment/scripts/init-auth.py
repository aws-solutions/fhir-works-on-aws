"""
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
"""
import boto3
import sys
import json

client = boto3.client('cognito-idp', region_name=sys.argv[2])
'''
python3 init-auth.py <ClientId> <Region> <USERNAME> <PASSWORD>
example run:
python3 init-auth.py 12pgvi3gsl32qp9h8lg130arr0 us-west-2 example_user example_password
'''
response = client.initiate_auth(
    AuthFlow='USER_PASSWORD_AUTH',
    AuthParameters={
        'USERNAME': sys.argv[3],
        'PASSWORD': sys.argv[4]
    },

    ClientId=sys.argv[1]
)

id_token = response['AuthenticationResult']['IdToken']
print(id_token)
