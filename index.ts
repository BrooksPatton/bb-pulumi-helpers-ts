import { getRegion } from "@pulumi/aws";
import { Vpc } from "@pulumi/aws/ec2";
import { getStack } from "@pulumi/pulumi";

const createdByTag = "Pulumi";

export async function createVpc(cidrBlock: string): Promise<Vpc>{
    const region = await getRegion();
    const stack = getStack();
    return new Vpc(`${stack} - ${region.name}`, {
        cidrBlock,
        enableDnsHostnames: true,
        tags: {
            Name: stack,
            CreatedBy: createdByTag
        }
    });
}