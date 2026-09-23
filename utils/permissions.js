// ─── Permission matrix ───────────────────────────────────────
export const PERMISSIONS = {
  admin: {
    canManageStaff: true,
    canDeleteStaff: true,
    canCreateAdmins: true,
    canManageInventory: true,
    canDeleteInventory: true,
    canEditAnyBranch: true,
    canViewAllBranches: true,
    canManageBranches: true,
    canVoidAnyOrder: true,
    canRefund: true,
    canHoldOrders: true, // ← MUST be true
    canApplyLargeDiscounts: true,
    canBroadcastMessages: true,
    canMessageAnyone: true,
    canViewAuditLogs: true,
    canCreateOrders: true,
    canViewAllOrders: true,
    canVoidAnyOrder: true,
  },
  branch_manager: {
    canManageStaff: true, // scoped (helper enforces branch)
    canDeleteStaff: false,
    canCreateAdmins: false,
    canManageInventory: true, // scoped to their branch
    canDeleteInventory: false,
    canEditAnyBranch: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canVoidAnyOrder: false, // can void within their branch
    canRefund: false,
    canApplyLargeDiscounts: false,
    canBroadcastMessages: false,
    canMessageAnyone: false, // only their branch staff
    canViewAuditLogs: false,
    canCreateOrders: true,
    canViewAllOrders: false, // only their branch
    canVoidAnyOrder: false,
  },
  employee: {
    canManageStaff: false,
    canDeleteStaff: false,
    canCreateAdmins: false,
    canManageInventory: false, // read-only
    canDeleteInventory: false,
    canEditAnyBranch: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canVoidAnyOrder: false,
    canRefund: false,
    canHoldOrders: true, // ← MUST be true
    canApplyDiscounts: true,
    canApplyLargeDiscounts: false,
    canAddCustomItems: true,
    canApplyLargeDiscounts: false,
    canBroadcastMessages: false,
    canMessageAnyone: false, // only their branch
    canViewAuditLogs: false,
    canCreateOrders: true, // employees ring up sales
    canViewAllOrders: false, // only their own
    canVoidAnyOrder: false,
  },
};

// ─── Boolean check ───────────────────────────────────────────
export const can = (user, permission) => {
  return PERMISSIONS[user?.role]?.[permission] === true;
};

// ─── Express middleware ──────────────────────────────────────
export const require_permission = (permission) => (req, res, next) => {
  if (!can(req.user, permission)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
  }
  next();
};

// ─── Branch scoping ──────────────────────────────────────────
export const check_branch_scope = (user, target_branch_id) => {
  if (["owner", "admin"].includes(user.role)) {
    return { allowed: true };
  }

  if (user.role === "branch_manager") {
    const user_branch = String(user.branch?._id ?? user.branch);
    const target = String(target_branch_id?._id ?? target_branch_id);

    if (user_branch !== target) {
      return {
        allowed: false,
        status: 403,
        message: "You can only operate in your own branch.",
      };
    }
    return { allowed: true };
  }

  if (user.role === "employee") {
    const user_branch = String(user.branch?._id ?? user.branch);
    const target = String(target_branch_id?._id ?? target_branch_id);

    if (user_branch !== target) {
      return {
        allowed: false,
        status: 403,
        message: "You can only operate in your own branch.",
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    message: "You do not have permission for this branch.",
  };
};

// ─── Staff scoping ───────────────────────────────────────────
export const check_staff_scope = (acting_user, target_user) => {
  if (String(acting_user._id) === String(target_user._id)) {
    return {
      allowed: false,
      status: 400,
      message: "You cannot perform this action on your own account.",
    };
  }

  if (["owner", "admin"].includes(acting_user.role)) {
    return { allowed: true };
  }

  if (acting_user.role === "branch_manager") {
    if (target_user.role !== "employee") {
      return {
        allowed: false,
        status: 403,
        message: "Managers can only manage employees.",
      };
    }

    const branch_check = check_branch_scope(acting_user, target_user.branch);
    if (!branch_check.allowed) {
      return {
        allowed: false,
        status: 403,
        message: "You can only manage staff in your own branch.",
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    message: "You do not have permission for this action.",
  };
};

// ─── Helper: should this query be filtered by branch? ────────
// Use in GET endpoints: if true, filter results by user's branch
export const should_scope_to_branch = (user) => {
  return !["owner", "admin"].includes(user.role);
};

// ─── Multi-tenancy helpers ───────────────────────────────────
// The organization a request operates within. Falls back to the
// user's own _id for legacy data created before tenancy existed.
export const org_of = (req) =>
  req.org ?? req.user?.organization ?? req.user?._id;

// True when a fetched document belongs to the caller's organization.
// Use after findById to enforce that one tenant can't touch another's data.
export const in_org = (req, doc) =>
  !!doc && String(doc.organization) === String(org_of(req));
