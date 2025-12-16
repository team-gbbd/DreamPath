package com.dreampath;
// trigger deploy

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DreamPathApplication {

	public static void main(String[] args) {
		SpringApplication.run(DreamPathApplication.class, args);
	}

}
