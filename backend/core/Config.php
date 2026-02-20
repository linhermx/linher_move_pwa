<?php
/**
 * Move API - Config
 */

class Config
{
    // Database credentials
    private static $db_host = 'localhost';
    private static $db_name = 'linher_move';
    private static $db_user = 'root';
    private static $db_pass = '';

    public static function getDBHost()
    {
        return self::$db_host;
    }
    public static function getDBName()
    {
        return self::$db_name;
    }
    public static function getDBUser()
    {
        return self::$db_user;
    }
    public static function getDBPass()
    {
        return self::$db_pass;
    }

    // API Keys (Placeholder)
    public static function getORSKey()
    {
        return getenv('ORS_API_KEY') ?: 'YOUR_API_KEY_HERE';
    }
}
