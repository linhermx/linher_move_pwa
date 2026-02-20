<?php
/**
 * Move API - Settings Model
 */

require_once 'Model.php';

class SettingsModel extends Model
{
    protected $table_name = "global_settings";

    /**
     * Get value by key
     */
    public function getByKey($key)
    {
        $query = "SELECT setting_value FROM " . $this->table_name . " WHERE setting_key = ? LIMIT 0,1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(1, $key);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['setting_value'] : null;
    }

    /**
     * Update or Create a setting
     */
    public function set($key, $value, $description = "")
    {
        $query = "INSERT INTO " . $this->table_name . " (setting_key, setting_value, description) 
                  VALUES (:key, :value, :desc) 
                  ON DUPLICATE KEY UPDATE setting_value = :value, description = :desc";

        $stmt = $this->db->prepare($query);

        $stmt->bindParam(":key", $key);
        $stmt->bindParam(":value", $value);
        $stmt->bindParam(":desc", $description);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    /**
     * Get all settings as key-value pair
     */
    public function getAllAsMap()
    {
        $query = "SELECT setting_key, setting_value FROM " . $this->table_name;
        $stmt = $this->db->prepare($query);
        $stmt->execute();

        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }
}
