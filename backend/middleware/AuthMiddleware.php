<?php
/**
 * Move API - Auth Middleware
 */

class AuthMiddleware
{
    /**
     * placeholder for authentication check
     * In a full implementation, this would check JWT or session
     */
    public static function authenticate()
    {
        // TODO: Implement real session/JWT checks
        // For now, we assume authenticated to allow development
        return true;
    }

    /**
     * Check if user has specific permission
     */
    public static function checkPermission($db, $userId, $permissionSlug)
    {
        $query = "SELECT COUNT(*) as allowed 
                  FROM user_permissions up 
                  JOIN permissions p ON up.permission_id = p.id 
                  WHERE up.user_id = ? AND p.slug = ? AND up.granted = 1";

        $stmt = $db->prepare($query);
        $stmt->bindParam(1, $userId);
        $stmt->bindParam(2, $permissionSlug);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row['allowed'] > 0)
            return true;

        // Fallback to role-based check
        // (Simplified for now)
        return false;
    }
}
