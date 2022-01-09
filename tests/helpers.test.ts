import * as pulumi from "@pulumi/pulumi";
import { Output } from "@pulumi/pulumi";
import { MockCallArgs, MockResourceArgs } from "@pulumi/pulumi/runtime";
import {createVpc} from "../index";

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