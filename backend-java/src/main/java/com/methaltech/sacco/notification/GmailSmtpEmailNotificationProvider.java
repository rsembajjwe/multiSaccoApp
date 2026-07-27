package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "sacco.providers.email", havingValue = "gmail_smtp")
class GmailSmtpEmailNotificationProvider implements NotificationProvider {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    GmailSmtpEmailNotificationProvider(
            JavaMailSender mailSender,
            @Value("${sacco.integrations.email.gmail.from-address:}") String fromAddress,
            @Value("${sacco.integrations.email.gmail.from-name:Tereka Online}") String fromName) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
    }

    @Override
    public String channel() {
        return "email";
    }

    @Override
    public String providerId() {
        return "gmail_smtp";
    }

    @Override
    public String recipient(Member member) {
        return member.getEmail();
    }

    @Override
    public NotificationSendResult send(Member member, String title, String message) {
        return sendTo(recipient(member), title, message);
    }

    @Override
    public NotificationSendResult sendTo(String recipient, String title, String message) {
        assertConfigured();
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(recipient);
            helper.setSubject(title);
            helper.setText(message, false);
            mailSender.send(mimeMessage);
            return NotificationSendResult.sent(null, "Gmail SMTP accepted the email.");
        } catch (MessagingException exception) {
            return NotificationSendResult.failed("Gmail SMTP email could not be composed.");
        } catch (MailException exception) {
            return NotificationSendResult.failed("Gmail SMTP email could not be sent.");
        } catch (java.io.UnsupportedEncodingException exception) {
            return NotificationSendResult.failed("Gmail SMTP sender name is invalid.");
        }
    }

    private void assertConfigured() {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new NotificationProviderException("Gmail SMTP provider is not fully configured.");
        }
    }
}
