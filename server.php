<?php
    $filename = "database.txt";
    if(isset($_POST["save"]) && !empty($_POST["save"])){
        $object = new StdClass();
        $object->last_modified = time();
        $object->content = $_POST["save"]; // JS saadab siia juba JSON massiivi

        file_put_contents($filename, json_encode($object));
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (file_exists($filename)) {
            header('Content-Type: application/json'); // Ütleme brauserile, et see on JSON
            echo file_get_contents($filename);
        }
        exit;
    }
?>