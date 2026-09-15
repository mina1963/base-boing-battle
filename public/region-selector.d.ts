import type { io } from "socket.io-client";
export type RegionMeasurement = {score:number;medianMs:number|null;jitterMs:number|null;failedProbes:number};
export function selectRegion(regions:Record<string,string|undefined>,fallback:string,connect:typeof io):Promise<{region:string;measurements:Record<string,RegionMeasurement>;measured:boolean}>;
export function rankRegion(samples:Array<number|null>):RegionMeasurement;
