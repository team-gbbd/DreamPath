package com.dreampath.domain.user.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 사용자 정보 수정 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "이름은 필수입니다")
    private String name;

    @Email(message = "유효한 이메일 주소를 입력해주세요")
    private String email;

    private String phone;

    private LocalDate birth;
}
