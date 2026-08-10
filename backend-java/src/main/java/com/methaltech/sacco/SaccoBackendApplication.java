package com.methaltech.sacco;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SaccoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SaccoBackendApplication.class, args);
	}

}
