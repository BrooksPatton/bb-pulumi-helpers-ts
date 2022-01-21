import { getRegion } from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
import { getStack } from "@pulumi/pulumi";
import { S3BucketTypes } from "./aws";
import s3WebPolicy from "./s3-web-policy";

export async function createS3Bucket(name: string, bucketType: S3BucketTypes): Promise<Bucket> {
    return new Bucket(`${name}`, {
        acl: bucketType,
        policy: JSON.stringify(s3WebPolicy(name))
    });
}