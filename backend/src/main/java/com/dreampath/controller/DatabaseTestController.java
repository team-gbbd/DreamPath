package com.dreampath.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseTestController {

    @GetMapping("/test/db")
    public String testDB() {
        return "PostgreSQL 연결 성공!";
    }
}
