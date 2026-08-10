package com.methaltech.sacco.privacy;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class EncryptedNationalIdConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return PiiCrypto.encryptNullable(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return PiiCrypto.decryptNullable(dbData);
    }
}
