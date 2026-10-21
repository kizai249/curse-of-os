// Football Quest — تخزين آمن في Keychain لرموز الاسترداد (DATA_CONTRACTS §5).
// العنصر متاح بعد أول فتح للجهاز، وما يُنسخ لأجهزة ثانية (ThisDeviceOnly).
#import <Foundation/Foundation.h>
#import <Security/Security.h>

static NSString *const FQService = @"com.usersx.footballquest.secure";

static NSMutableDictionary *FQQuery(NSString *key) {
    return [@{
        (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService: FQService,
        (__bridge id)kSecAttrAccount: key,
    } mutableCopy];
}

static char *FQCopyString(NSString *value) {
    const char *utf8 = [value UTF8String];
    char *copy = (char *)malloc(strlen(utf8) + 1);
    strcpy(copy, utf8);
    return copy; // Unity يحرر الذاكرة بعد تحويلها لـ string
}

extern "C" {

char *FQ_SecureGet(const char *key) {
    NSMutableDictionary *query = FQQuery([NSString stringWithUTF8String:key]);
    query[(__bridge id)kSecReturnData] = @YES;
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    CFTypeRef result = NULL;
    if (SecItemCopyMatching((__bridge CFDictionaryRef)query, &result) != errSecSuccess || result == NULL) return NULL;
    NSData *data = (__bridge_transfer NSData *)result;
    NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    return value ? FQCopyString(value) : NULL;
}

bool FQ_SecureSet(const char *key, const char *value) {
    NSMutableDictionary *query = FQQuery([NSString stringWithUTF8String:key]);
    SecItemDelete((__bridge CFDictionaryRef)query);
    query[(__bridge id)kSecValueData] = [[NSString stringWithUTF8String:value] dataUsingEncoding:NSUTF8StringEncoding];
    query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
    return SecItemAdd((__bridge CFDictionaryRef)query, NULL) == errSecSuccess;
}

void FQ_SecureDelete(const char *key) {
    SecItemDelete((__bridge CFDictionaryRef)FQQuery([NSString stringWithUTF8String:key]));
}

}
