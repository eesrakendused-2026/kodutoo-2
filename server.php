<?php
    if(isset($POST["save"]) && !empty($_POST["save"])){
        saveToFile($POST["save"]);
    }

    function saveToFile($stringToSave){
        $object = new StdClass();
        $object->last_modified = time();
        $object->contet = $stringToSave;

        $jsonString = json_encode($object);
        file_put_contents("./db.txt", $jsonString);
    }

?>