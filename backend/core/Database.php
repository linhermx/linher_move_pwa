<?php
/**
 * Move API - Database Connection
 */

class Database
{
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct()
    {
        $this->host = Config::getDBHost();
        $this->db_name = Config::getDBName();
        $this->username = Config::getDBUser();
        $this->password = Config::getDBPass();
    }

    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        }
        catch (PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            // In a real environment, we might want to hide the exact error from the user
            http_response_code(500);
            echo json_encode(["message" => "Database connection failed."]);
            exit();
        }

        return $this->conn;
    }
}
