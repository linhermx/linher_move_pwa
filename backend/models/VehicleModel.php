<?php
/**
 * Move API - Vehicle Model
 */

require_once 'Model.php';

class VehicleModel extends Model
{
    protected $table_name = "vehicles";

    /**
     * Create a new vehicle
     */
    public function create($data)
    {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET name=:name, plate=:plate, rendimiento_teorico=:rendimiento_teorico, 
                      rendimiento_real=:rendimiento_real, photo_path=:photo_path, status=:status";

        $stmt = $this->db->prepare($query);

        // Sanitize and bind
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":plate", $data['plate']);
        $stmt->bindParam(":rendimiento_teorico", $data['rendimiento_teorico']);
        $stmt->bindParam(":rendimiento_real", $data['rendimiento_real']);
        $stmt->bindParam(":photo_path", $data['photo_path']);
        $stmt->bindParam(":status", $data['status']);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    /**
     * Update an existing vehicle
     */
    public function update($id, $data)
    {
        $query = "UPDATE " . $this->table_name . " 
                  SET name=:name, plate=:plate, rendimiento_teorico=:rendimiento_teorico, 
                      rendimiento_real=:rendimiento_real, status=:status 
                  WHERE id=:id";

        $stmt = $this->db->prepare($query);

        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":plate", $data['plate']);
        $stmt->bindParam(":rendimiento_teorico", $data['rendimiento_teorico']);
        $stmt->bindParam(":rendimiento_real", $data['rendimiento_real']);
        $stmt->bindParam(":status", $data['status']);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
