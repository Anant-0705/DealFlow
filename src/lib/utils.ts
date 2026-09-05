import { cn as mergeClasses } from "cn";

export const cn: typeof mergeClasses = (...inputs) => mergeClasses(...inputs);
