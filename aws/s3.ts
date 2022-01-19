import { getRegion } from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
import { getStack } from "@pulumi/pulumi";
import { S3BucketTypes } from "./aws";

export async function createS3Bucket(name: string, bucketType: S3BucketTypes): Promise<Bucket> {
    const region = await getRegion();
    const stack = getStack();
    return new Bucket(`${name}`, {
        acl: bucketType,
        
    });
}