/// Time limited access to a shared visa pack, enforced by Seal.
/// A Grant names one consultant and an expiry on the Sui clock.
/// Seal key servers release the decryption key only while the grant is live.
module prior_share::share;

use sui::clock::Clock;

const ENoAccess: u64 = 1;
const ENotOwner: u64 = 2;

public struct Grant has key {
    id: UID,
    owner: address,
    consultant: address,
    expires_ms: u64,
    revoked: bool,
}

public fun create_grant(consultant: address, expires_ms: u64, ctx: &mut TxContext) {
    let grant = Grant { id: object::new(ctx), owner: ctx.sender(), consultant, expires_ms, revoked: false };
    transfer::share_object(grant);
}

public fun revoke(grant: &mut Grant, ctx: &TxContext) {
    assert!(ctx.sender() == grant.owner, ENotOwner);
    grant.revoked = true;
}

/// Seal identity = grant object id bytes followed by any nonce.
fun is_prefix(prefix: vector<u8>, word: &vector<u8>): bool {
    if (prefix.length() > word.length()) return false;
    let mut i = 0;
    while (i < prefix.length()) {
        if (prefix[i] != word[i]) return false;
        i = i + 1;
    };
    true
}

entry fun seal_approve(id: vector<u8>, grant: &Grant, clock: &Clock, ctx: &TxContext) {
    assert!(is_prefix(grant.id.to_bytes(), &id), ENoAccess);
    assert!(!grant.revoked, ENoAccess);
    assert!(clock.timestamp_ms() < grant.expires_ms, ENoAccess);
    assert!(ctx.sender() == grant.consultant || ctx.sender() == grant.owner, ENoAccess);
}
