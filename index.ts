import { getRegion } from "@pulumi/aws";
import { InternetGateway, Subnet, Vpc } from "@pulumi/aws/ec2";
import { getStack } from "@pulumi/pulumi";

const createdByTag = "Pulumi";

export async function createVpc(cidrBlock = "10.0.0.0/16"): Promise<Vpc>{
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

export async function createInternetGateway(vpc: Vpc): Promise<InternetGateway> {
    const region = await getRegion();
    const stack = getStack();
    return new InternetGateway(`${stack} - ${region.name}`, {
        tags: {
            Name: stack,
            CreatedBy: createdByTag,
        },
        vpcId: vpc.id
    });
}

export async function createSubnet(
    cidrBlock: string, 
    vpc: Vpc, 
    availabilityZone: string, 
    isPublic = false
): Promise<Subnet> {
    const region = await getRegion();
    const stack = getStack();
    const name = `${isPublic ? "public" : "private"} - ${stack} - ${region.name}${availabilityZone}`;
    return new Subnet(name, {
        cidrBlock,
        vpcId: vpc.id,
        availabilityZone: `${region.name}${availabilityZone}`,
        mapPublicIpOnLaunch: isPublic,
        tags: {
            Name: `${isPublic ? "public" : "private"} - ${region.name}${availabilityZone}`,
            CreatedBy: createdByTag
        }
    });
}