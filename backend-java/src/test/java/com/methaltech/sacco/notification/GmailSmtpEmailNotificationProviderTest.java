package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.methaltech.sacco.member.Member;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.InputStream;
import java.lang.reflect.Constructor;
import java.time.LocalDate;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;

class GmailSmtpEmailNotificationProviderTest {

    @Test
    void sendCreatesAndSendsMimeMessage() {
        CapturingMailSender mailSender = new CapturingMailSender(false);
        GmailSmtpEmailNotificationProvider provider = new GmailSmtpEmailNotificationProvider(
                mailSender,
                "no-reply@tereka.online",
                "Tereka Online");

        NotificationSendResult result = provider.send(member(), "Payment received", "Your deposit was posted.");

        assertEquals("sent", result.status());
        assertTrue(mailSender.sent);
    }

    @Test
    void sendReturnsFailedWhenSmtpRejectsMessage() {
        CapturingMailSender mailSender = new CapturingMailSender(true);
        GmailSmtpEmailNotificationProvider provider = new GmailSmtpEmailNotificationProvider(
                mailSender,
                "no-reply@tereka.online",
                "Tereka Online");

        NotificationSendResult result = provider.send(member(), "Payment received", "Your deposit was posted.");

        assertEquals("failed", result.status());
        assertTrue(result.providerMessage().contains("Gmail SMTP"));
    }

    private Member member() {
        try {
            Constructor<Member> constructor = Member.class.getDeclaredConstructor(
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    LocalDate.class);
            constructor.setAccessible(true);
            return constructor.newInstance(
                    "member_green_amina",
                    "tenant_green",
                    "branch_green_main",
                    "GVS-0001",
                    "Amina Green",
                    "individual",
                    "+256700000001",
                    "amina@example.com",
                    "CM0001",
                    "hash",
                    "salt",
                    "active",
                    "verified",
                    LocalDate.now());
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private static class CapturingMailSender implements JavaMailSender {
        private final boolean fail;
        private boolean sent;

        private CapturingMailSender(boolean fail) {
            this.fail = fail;
        }

        @Override
        public MimeMessage createMimeMessage() {
            return new MimeMessage(Session.getInstance(new Properties()));
        }

        @Override
        public MimeMessage createMimeMessage(InputStream contentStream) {
            try {
                return new MimeMessage(Session.getInstance(new Properties()), contentStream);
            } catch (jakarta.mail.MessagingException exception) {
                throw new AssertionError(exception);
            }
        }

        @Override
        public void send(MimeMessage mimeMessage) throws MailException {
            if (fail) throw new org.springframework.mail.MailSendException("failed");
            sent = true;
        }

        @Override
        public void send(MimeMessage... mimeMessages) throws MailException {
            for (MimeMessage mimeMessage : mimeMessages) send(mimeMessage);
        }

        @Override
        public void send(org.springframework.mail.javamail.MimeMessagePreparator mimeMessagePreparator) throws MailException {
            MimeMessage message = createMimeMessage();
            try {
                mimeMessagePreparator.prepare(message);
            } catch (Exception exception) {
                throw new org.springframework.mail.MailPreparationException(exception);
            }
            send(message);
        }

        @Override
        public void send(org.springframework.mail.javamail.MimeMessagePreparator... mimeMessagePreparators) throws MailException {
            for (org.springframework.mail.javamail.MimeMessagePreparator preparator : mimeMessagePreparators) send(preparator);
        }

        @Override
        public void send(org.springframework.mail.SimpleMailMessage simpleMessage) throws MailException {
            sent = true;
        }

        @Override
        public void send(org.springframework.mail.SimpleMailMessage... simpleMessages) throws MailException {
            sent = true;
        }
    }
}
