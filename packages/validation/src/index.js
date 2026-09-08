"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSafePath = resolveSafePath;
const node_path_1 = __importDefault(require("node:path"));
/**
 * Resolves a requested user path against the storage root.
 * Blocks path traversal, absolute paths, drive paths, and UNC-like input.
 */
function resolveSafePath(storageRoot, userPath = '') {
    if (/^[a-zA-Z]:/.test(userPath) || userPath.startsWith('\\\\')) {
        throw new Error('Security Error: Absolute paths are not allowed');
    }
    const root = node_path_1.default.resolve(storageRoot);
    const sanitizedPath = userPath.replace(/^[/\\]+/, '');
    const resolved = node_path_1.default.resolve(root, sanitizedPath);
    const relative = node_path_1.default.relative(root, resolved);
    if (relative === '' || (!relative.startsWith('..') && !node_path_1.default.isAbsolute(relative))) {
        return resolved;
    }
    throw new Error('Security Error: Path traversal detected');
}
