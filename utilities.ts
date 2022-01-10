import { Output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";

export function convertPulumiOutputs(pulumiOutputs: Output<any>[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
        try {
            pulumi.all(pulumiOutputs).apply(resolve);
        } catch (error) {
            reject(error);
        }
    });
}