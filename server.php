<?php
    if(isset($_GET["ping"])){
        header("Content-Type: text/plain; charset=UTF-8");
        echo "ok";
        exit;
    }

    if(isset($_POST["save"]) && !empty($_POST["save"])){
        saveToFile($_POST["save"]);
    }

    function saveToFile($stringToSave){
        $object = new StdClass();
        $object->last_modified = time();
        $object->content = $stringToSave;

        $jsonString = json_encode($object);
        file_put_contents("database.txt", $jsonString);
    }

?>