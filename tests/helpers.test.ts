import { Subnet } from "@pulumi/aws/ec2";
import * as pulumi from "@pulumi/pulumi";
import { Output } from "@pulumi/pulumi";
import { MockCallArgs, MockResourceArgs } from "@pulumi/pulumi/runtime";
import {createVpc, createInternetGateway, createSubnet} from "../index";

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

describe("Pulumi Helpers", () => {
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
});

function convertPulumiOutputs(pulumiOutputs: Output<any>[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
        try {
            pulumi.all(pulumiOutputs).apply(resolve);
        } catch (error) {
            reject(error);
        }
    });
}