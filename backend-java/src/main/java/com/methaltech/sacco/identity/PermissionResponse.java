package com.methaltech.sacco.identity;

record PermissionResponse(String id, String module, String action, String description) {

    static PermissionResponse from(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getModule(),
                permission.getAction(),
                permission.getDescription());
    }
}
