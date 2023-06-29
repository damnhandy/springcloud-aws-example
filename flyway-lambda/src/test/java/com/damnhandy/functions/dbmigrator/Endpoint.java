package com.damnhandy.functions.dbmigrator;

import me.madhead.aws_junit5.common.AWSEndpoint;

public class Endpoint implements AWSEndpoint {
    @Override
    public String url() {
        return "http://localhost:4566";
    }

    @Override
    public String region() {
        return "us-east-1";
    }

    @Override
    public String accessKey() {
        return "test";
    }

    @Override
    public String secretKey() {
        return "test";
    }
}
