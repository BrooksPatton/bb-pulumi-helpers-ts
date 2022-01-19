import { getRegion, s3 } from "@pulumi/aws";
import { InternetGateway, MainRouteTableAssociation, RouteTable, RouteTableAssociation, Subnet, Vpc } from "@pulumi/aws/ec2";
import { Bucket } from "@pulumi/aws/s3";
import { getStack } from "@pulumi/pulumi";
import { convertPulumiOutputs } from "../utilities";

export enum S3BucketTypes {
    "public" = "public-read"
}

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

export async function createRouteTable(vpc: Vpc, internetGateway: InternetGateway): Promise<RouteTable> {
    const region = await getRegion();
    const stack = getStack();

    return new RouteTable(`${stack} - ${region.name}`, {
        vpcId: vpc.id,
        routes: [{
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id
        }],
        tags: {
            Name: stack,
            CreatedBy: createdByTag
        }
    });
}

export async function createRouteTableAssociation(routeTable: RouteTable, subnet: Subnet): Promise<RouteTableAssociation> {
    const [subnetUrn, routeTableUrn] = await convertPulumiOutputs([subnet.urn, routeTable.urn]);
    return new RouteTableAssociation(`${subnetUrn} -> ${routeTableUrn}`, {
        routeTableId: routeTable.id,
        subnetId: subnet.id
    });
}

export async function createMainRouteTableAssociation(routeTable: RouteTable, vpc: Vpc): Promise<MainRouteTableAssociation> {
    const [routeTableName] = await convertPulumiOutputs([routeTable.urn]);
    return new MainRouteTableAssociation(`${routeTableName} -> main`, {
        routeTableId: routeTable.id,
        vpcId: vpc.id
    });
}
