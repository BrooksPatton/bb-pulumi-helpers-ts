import { Subnet, RouteTable, RouteTableAssociation, MainRouteTableAssociation } from "@pulumi/aws/ec2";
import * as pulumi from "@pulumi/pulumi";
import { Output } from "@pulumi/pulumi";
import { MockCallArgs, MockResourceArgs } from "@pulumi/pulumi/runtime";
import {
    createVpc, 
    createInternetGateway, 
    createSubnet, 
    createRouteTable,
    createRouteTableAssociation,
    createMainRouteTableAssociation
} from "../aws";
import { convertPulumiOutputs } from "../utilities";

const region = "test-region";
const stack = "test-stack";
const createdByTag = "Pulumi";

pulumi.runtime.setMocks({
    newResource(args: MockResourceArgs) {
        return {
            id: args.inputs.name + "_id",
            state: {
                ...args.inputs
            }
        };
    },
    call(args: MockCallArgs) {
        switch (args.token) {
        case "aws:index/getRegion:getRegion":
            return {name: region};
        default:
            console.log("not mocking call for ", args.token);
            return args;
        }
    }
}, "testing", stack);

describe("aws Pulumi Helpers", () => {
    describe("vpc", () => {
        let urn;
        let cidrBlock;
        let enableDnsHostnames;
        let tags;
        const expectedCidrBlock = "10.0.0.0/16";

        beforeAll(async () => {
            const vpc = await createVpc(expectedCidrBlock);
            [urn, cidrBlock, enableDnsHostnames, tags] = await convertPulumiOutputs([
                vpc.urn,
                vpc.cidrBlock,
                vpc.enableDnsHostnames,
                vpc.tags
            ]);
        });

        test("urn has good information", () => {
            expect(urn).toContain(`${stack} - ${region}`);
        });

        test("cidr block is set", () => {
            expect(cidrBlock).toBe(expectedCidrBlock);
        });

        test("dns hostnames are enabled", () => {
            expect(enableDnsHostnames).toBe(true);
        });

        test("tag name should be set to the stack", () => {
            expect(tags.Name).toBe(stack);
        });

        test("created by pulumi tag should be set", () => {
            expect(tags.CreatedBy).toBe(createdByTag);
        });
    });

    describe("internet gateway", () => {
        let urn;
        let tags;
        let vpcId;
        let expectedVpcId;

        beforeAll(async () => {
            const vpc = await createVpc();
            const internetGateway = await createInternetGateway(vpc);
            [urn, tags, vpcId, expectedVpcId] = await convertPulumiOutputs([
                internetGateway.urn,
                internetGateway.tags,
                internetGateway.vpcId,
                vpc.id
            ]);
        });

        test("urn is set to a good name", () => {
            expect(urn).toContain(`${stack} - ${region}`);
        });

        test("name tag is set to the stack", () => {
            expect(tags.Name).toBe(stack);
        });

        test("created by tag is set", () => {
            expect(tags.CreatedBy).toBe(createdByTag);
        });

        test("associated with the provided vpc", () => {
            expect(vpcId).toBe(expectedVpcId);
        });
    });

    describe("public subnet", () => {
        let urn;
        let cidrBlock;
        let vpcId;
        let availabilityZone;
        let mapPublicIpOnLaunch;
        let tags;
        const expectedCidrBlock = "10.0.1.0/24";
        let expectedVpcId;
        const expectedAvailabilityZone = "a";

        beforeAll(async () => {
            const vpc = await createVpc();
            const subnet: Subnet = await createSubnet(expectedCidrBlock, vpc, expectedAvailabilityZone, true);
            [
                urn, 
                cidrBlock, 
                vpcId, 
                availabilityZone, 
                mapPublicIpOnLaunch, 
                tags,
                expectedVpcId
            ] = await convertPulumiOutputs([
                subnet.urn,
                subnet.cidrBlock,
                subnet.vpcId,
                subnet.availabilityZone,
                subnet.mapPublicIpOnLaunch,
                subnet.tags,
                vpc.id
            ]);
        });

        test("urn should be a good name", () => {
            expect(urn).toContain(
                `public - ${stack} - ${region}${expectedAvailabilityZone}`
            );
        });

        test("cidr block should be set", () => {
            expect(cidrBlock).toBe(expectedCidrBlock);
        });

        test("subnet should be associated with the provided vpc", () => {
            expect(vpcId).toBe(expectedVpcId);
        });

        test("subnet should be in the provided availability zone", () => {
            expect(availabilityZone).toBe(`${region}${expectedAvailabilityZone}`);
        });

        test("subnet should be public", () => {
            expect(mapPublicIpOnLaunch).toBe(true);
        });

        test("name tag should be set", () => {
            expect(tags.Name).toBe(`public - ${region}${expectedAvailabilityZone}`);
        });

        test("Created by tag should be set", () => {
            expect(tags.CreatedBy).toBe(createdByTag);
        });
    });

    describe("private subnet", () => {
        let urn;
        let cidrBlock;
        let vpcId;
        let availabilityZone;
        let mapPublicIpOnLaunch;
        let tags;
        const expectedCidrBlock = "10.0.1.0/24";
        let expectedVpcId;
        const expectedAvailabilityZone = "a";

        beforeAll(async () => {
            const vpc = await createVpc();
            const subnet: Subnet = await createSubnet(expectedCidrBlock, vpc, expectedAvailabilityZone);
            [
                urn, 
                mapPublicIpOnLaunch, 
                tags
            ] = await convertPulumiOutputs([
                subnet.urn,
                subnet.mapPublicIpOnLaunch,
                subnet.tags
            ]);
        });

        test("urn should be a good name", () => {
            expect(urn).toContain(
                `private - ${stack} - ${region}${expectedAvailabilityZone}`
            );
        });

        test("subnet should be private", () => {
            expect(mapPublicIpOnLaunch).toBe(false);
        });

        test("name tag should be set", () => {
            expect(tags.Name).toBe(`private - ${region}${expectedAvailabilityZone}`);
        });
    });

    describe("route table", () => {
        let urn;
        let vpcId;
        let expectedVpcId;
        let routes: any[];
        let tags;
        let expectedGatewayId;
        let routeTable;

        beforeAll(async () => {
            const vpc = await createVpc();
            const internetGateway = await createInternetGateway(vpc);
            routeTable = await createRouteTable(vpc, internetGateway);
            [
                urn,
                vpcId,
                expectedVpcId,
                routes,
                tags,
            ] = await convertPulumiOutputs([
                routeTable.urn,
                routeTable.vpcId,
                vpc.id,
                routeTable.routes,
                routeTable.tags,
            ]);
        });

        test("route table has a good name", () => {
            expect(urn).toContain(`${stack} - ${region}`);
        });

        test("route table is associated with the provided vpc", () => {
            expect(vpcId).toBe(expectedVpcId);
        });

        test("route table has a route to the internet", async () => {
            routes.forEach(async route => {
                const [cidrBlock, gatewayId] = await convertPulumiOutputs([
                    route.cidrBlock,
                    route.gatewayId
                ]);
                expect(cidrBlock).toBe("0.0.0.0/0");
                expect(gatewayId).toBe(expectedGatewayId);
            });
        });

        test("name tag should be set", () => {
            expect(tags.Name).toBe(stack);
        });

        test("created by tag should be set", () => {
            expect(tags.CreatedBy).toBe(createdByTag);
        });
    });

    describe("associating public subnet with route table", () => {
        let urn: string;
        let routeTableId: string;
        let expectedRouteTableId: string;
        let subnetId: string;
        let expectedSubnetId: string;
        let subnetUrn: string;
        let routeTableUrn: string;

        beforeAll(async () => {
            const vpc = await createVpc();
            const internetGateway = await createInternetGateway(vpc);
            const routeTable = await createRouteTable(vpc, internetGateway);
            const subnet = await createSubnet("10.0.1.0/24", vpc, "a");
            const routeTableAssociation: RouteTableAssociation = await createRouteTableAssociation(routeTable, subnet);

            [
                urn,
                routeTableId,
                expectedRouteTableId,
                subnetId,
                expectedSubnetId,
                subnetUrn,
                routeTableUrn,
            ] = await convertPulumiOutputs([
                routeTableAssociation.urn,
                routeTableAssociation.routeTableId,
                routeTable.id,
                routeTableAssociation.subnetId,
                subnet.id,
                subnet.urn,
                routeTable.urn,
            ]);
        });

        test("route table association has a name that makes sense", () => {
            expect(urn).toContain(`${subnetUrn} -> ${routeTableUrn}`);
        });

        test("the route table association is associated with the provided route table", () => {
            expect(routeTableId).toBe(expectedRouteTableId);
        });

        test("the route table association is associated with the provided subnet", () => {
            expect(subnetId).toBe(expectedSubnetId);
        });
    });

    describe("associating a route table as the main route table for a vpc", () => {
        let urn;
        let routeTableId;
        let expectedRouteTableId;
        let vpcId;
        let expectedVpcId;
        let routeTableUrn;

        beforeAll(async () => {
            const vpc = await createVpc();
            const internetGateway = await createInternetGateway(vpc);
            const routeTable = await createRouteTable(vpc, internetGateway);
            const mainRouteTableAssociation = await createMainRouteTableAssociation(routeTable, vpc);

            [
                urn,
                routeTableId,
                expectedRouteTableId,
                vpcId,
                expectedVpcId,
                routeTableUrn
            ] = await convertPulumiOutputs([
                mainRouteTableAssociation.urn,
                mainRouteTableAssociation.routeTableId,
                routeTable.id,
                mainRouteTableAssociation.vpcId,
                vpc.id,
                routeTable.urn
            ]);
        });

        test("main route table association has a good name", () => {
            expect(urn).toContain(`${routeTableUrn} -> main`);
        });

        test("the route table is now a main routet table", () => {
            expect(routeTableId).toBe(expectedRouteTableId);
        });

        test("the main route table is associated with the provided vpc", () => {
            expect(vpcId).toBe(expectedVpcId);
        });
    });

    describe("creating an s3 bucket", () => {
        test.todo("can create an s3 bucket");
    });
});