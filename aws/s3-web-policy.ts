export type WebPolicy =  {
    Version: string,
    Statement: WebPolicyStatement[]
}

export type WebPolicyStatement = {
    Sid: string,
    Effect: string,
    Principal: string,
    Action: string[],
    Resource: string[]
}
export default function s3WebPolicy(bucketName: string): WebPolicy {
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": [
                    "s3:GetObject"
                ],
                "Resource": [
                    `arn:aws:s3:::${bucketName}/*`
                ]
            }
        ]
    };
    
}
