# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# Minimal subset of the XPath grammar required to parse the XPath SearchParameter expressions
# See the docs for the syntax of this file at https://nearley.js.org/docs/grammar

@preprocessor typescript

Main -> unionExpression                                                              {% id %}

unionExpression -> unionExpression _ "|" _ expression                                {% d => ([ Array.isArray(d[0]) ? d[0].flat() : d[0], d[4]]).flat() %}
	| expression                                                                     {% d => ([d[0]]) %}
	| _id                                                                            {% d => ([d[0]]) %}

# This is NOT a valid XPath expression, but for some reason many Implementation Guides "_id" reuse the fhirPath expression as XPath, so we allow it.
_id -> IDENTIFIER ".id"                                                              {% d=>({resourceType:d[0], path:'id'})%}

expression-> path                                                                    {% id %}
	| path simpleWhere pathContinuation "/@value":?                                  {% d => ({...d[0], path:`${d[0].path}${d[2]? '.'+d[2] : ''}`, condition:[`${d[0].path}.${d[1][0]}`, d[1][1], d[1][2]]}) %}

path -> "f:" IDENTIFIER pathContinuation                                             {% (d) => ({resourceType:d[1], path:d[2]}) %}

pathContinuation -> ("/f:" IDENTIFIER):*                                             {% d=>d[0].map((x:any)=>x[1]).join('.') %}

simpleWhere -> "[" simpleWhereExp "]"                                                {% d => d[1] %}

simpleWhereExp-> wherePrefix:? IDENTIFIER "/@value":? _ "=" _ "'" STRING_VALUE "'"   {% d => [d[1], d[4], d[7]] %}

wherePrefix -> "f:" | "@"                                                            {% id %}

IDENTIFIER -> [a-zA-Z-]:+                                                            {% d => d[0].join("") %}

STRING_VALUE -> [a-zA-Z0-9-:/.]:+                                                    {% d => d[0].join("") %}

_ -> [\s]:*                                                                          {% () => null %}
