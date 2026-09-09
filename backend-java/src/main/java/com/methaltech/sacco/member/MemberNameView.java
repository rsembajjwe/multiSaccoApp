package com.methaltech.sacco.member;

/** Lightweight projection for member-name lookups (id + full name only). */
public interface MemberNameView {
    String getId();

    String getFullName();
}
