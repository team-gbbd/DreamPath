import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        # 루트 .env의 MAIL_USERNAME, MAIL_PASSWORD 사용
        self.smtp_username = os.getenv("MAIL_USERNAME")
        self.smtp_password = os.getenv("MAIL_PASSWORD")
        self.sender_email = os.getenv("SENDER_EMAIL", self.smtp_username)

    def send_inquiry_reply(
        self,
        recipient_email: str,
        recipient_name: str,
        inquiry_content: str,
        reply_content: str
    ):
        """문의 답변 이메일 전송"""
        try:
            # 이메일 메시지 생성
            message = MIMEMultipart()
            message["From"] = self.sender_email
            message["To"] = recipient_email
            message["Subject"] = f"[DreamPath] 문의 답변 - {recipient_name}님"

            # 본문 작성
            body = reply_content
            message.attach(MIMEText(body, "plain", "utf-8"))

            # SMTP 서버 연결 및 전송
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()  # TLS 보안 시작
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)

            print(f"✉️ 이메일 전송 성공: {recipient_email}")

        except Exception as e:
            print(f"❌ 이메일 전송 실패: {recipient_email} - {str(e)}")
            raise RuntimeError(f"이메일 전송에 실패했습니다: {str(e)}")
