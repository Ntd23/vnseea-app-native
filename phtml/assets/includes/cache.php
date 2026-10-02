<?php
class Cache {
    function Wo_OpenCacheDir() {
        if (!file_exists('cache')) {
            $oldmask = umask(0);
            @mkdir('cache', 0777, true);
            @umask($oldmask);
        }
        if (!file_exists('cache/users')) {
            $oldmask = umask(0);
            @mkdir('cache/users', 0777, true);
            @umask($oldmask);
        }
        if (!file_exists('cache/groups')) {
            $oldmask = umask(0);
            @mkdir('cache/groups', 0777, true);
            @umask($oldmask);
        }
        if (!file_exists('cache/.htaccess')) {
            $f = @fopen("cache/.htaccess", "a+");
            if ($f) {
                @fwrite($f, "deny from all");
                @fclose($f);
            }
        }
        if (!file_exists('cache/index.html')) {
            $f = @fopen("cache/index.html", "a+");
            if ($f) {
                @fclose($f);
            }
        }
    }
    function read($fileName) {
        $fileName = 'cache/' . $fileName;
        if (!is_file($fileName)) {
            return null;
        }
        $variable = @file_get_contents($fileName);
        if ($variable === false || $variable === '') {
            return null;
        }
        $invalid = false;
        set_error_handler(function () use (&$invalid) {
            $invalid = true;
            return true;
        }, E_WARNING | E_NOTICE);
        try {
            $value = unserialize($variable);
        } finally {
            restore_error_handler();
        }
        return ($invalid || ($value === false && $variable !== 'b:0;')) ? null : $value;
    }
    function write($fileName, $variable) {
        $fileName = 'cache/' . $fileName;
        $directory = realpath(dirname($fileName));
        if ($directory === false) {
            return false;
        }
        $temporaryFile = @tempnam($directory, '.cache-');
        if ($temporaryFile === false || dirname($temporaryFile) !== $directory) {
            if ($temporaryFile !== false) {
                @unlink($temporaryFile);
            }
            return false;
        }
        $contents = serialize($variable);
        if (@file_put_contents($temporaryFile, $contents, LOCK_EX) !== strlen($contents)) {
            @unlink($temporaryFile);
            return false;
        }
        @chmod($temporaryFile, 0644);
        if (!@rename($temporaryFile, $fileName)) {
            @unlink($temporaryFile);
            return false;
        }
        return true;
    }
    function delete($fileName) {
        $fileName = 'cache/' . $fileName;
        @unlink($fileName);
    }
}
?>
