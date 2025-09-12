"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.generateUUID = generateUUID;
exports.generateToken = generateToken;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
// Simple UUID v4 generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Generate a simple token for user identification
function generateToken() {
    return generateUUID();
}
