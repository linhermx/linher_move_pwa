<?php
/**
 * Move API - Quotation Model
 */

require_once 'Model.php';

class QuotationModel extends Model
{
    protected $table_name = "quotations";

    /**
     * Get all records from the table with filters
     */
    public function filterQuotes($filters)
    {
        $query = "SELECT * FROM " . $this->table_name . " WHERE 1=1";
        $params = [];

        if (!empty($filters['folio'])) {
            $query .= " AND folio LIKE ?";
            $params[] = "%" . $filters['folio'] . "%";
        }

        if (!empty($filters['status'])) {
            $query .= " AND status = ?";
            $params[] = $filters['status'];
        }

        $query .= " ORDER BY created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        return $stmt;
    }
    public function generateFolio($userId, $db)
    {
        // 1. Get user initials (Mock for now, normally from user record)
        $userInitials = "JR";

        $datePart = date("ymd");
        $yearMonth = date("ym");

        // 2. Concurrency-safe counter update
        $db->beginTransaction();
        try {
            $query = "SELECT last_count FROM folio_counters WHERE year_month = ? FOR UPDATE";
            $stmt = $db->prepare($query);
            $stmt->execute([$yearMonth]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $newCount = $row['last_count'] + 1;
                $update = "UPDATE folio_counters SET last_count = ? WHERE year_month = ?";
                $db->prepare($update)->execute([$newCount, $yearMonth]);
            }
            else {
                $newCount = 1;
                $insert = "INSERT INTO folio_counters (year_month, last_count) VALUES (?, ?)";
                $db->prepare($insert)->execute([$yearMonth, $newCount]);
            }
            $db->commit();
        }
        catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }

        $counterPart = str_pad($newCount, 3, "0", STR_PAD_LEFT);

        return "LM{$userInitials}-{$datePart}{$counterPart}";
    }

    /**
     * Create complex quotation with stops and services
     */
    public function createQuote($data)
    {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET folio=:folio, user_id=:user_id, vehicle_id=:vehicle_id, 
                      origin_address=:origin, destination_address=:dest,
                      distance_total=:dist, time_total=:time,
                      costo_logistico_redondeado=:log_cost,
                      subtotal=:subtotal, iva=:iva, total=:total,
                      status='pendiente'";

        $stmt = $this->db->prepare($query);

        $stmt->bindParam(":folio", $data['folio']);
        $stmt->bindParam(":user_id", $data['user_id']);
        $stmt->bindParam(":vehicle_id", $data['vehicle_id']);
        $stmt->bindParam(":origin", $data['origin_address']);
        $stmt->bindParam(":dest", $data['destination_address']);
        $stmt->bindParam(":dist", $data['distance_total']);
        $stmt->bindParam(":time", $data['time_total']);
        $stmt->bindParam(":log_cost", $data['costo_logistico_redondeado']);
        $stmt->bindParam(":subtotal", $data['subtotal']);
        $stmt->bindParam(":iva", $data['iva']);
        $stmt->bindParam(":total", $data['total']);

        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        return false;
    }

    /**
     * Add stops to a quote
     */
    public function addStops($quoteId, $stops)
    {
        $query = "INSERT INTO quotation_stops (quotation_id, address, order_index) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($query);
        foreach ($stops as $idx => $address) {
            $stmt->execute([$quoteId, $address, $idx]);
        }
    }
}
