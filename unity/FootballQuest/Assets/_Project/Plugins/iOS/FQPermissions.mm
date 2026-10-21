// Football Quest — حالة وطلب أذونات الموقع (When In Use فقط) والكاميرا على iOS.
// القيم المرجعة بنفس ترتيب FootballQuest.Core.Permissions.PermissionStatus:
// 0 NotDetermined، 1 Granted، 2 GrantedApproximate، 3 Denied، 4 Restricted.
#import <AVFoundation/AVFoundation.h>
#import <CoreLocation/CoreLocation.h>
#import <UIKit/UIKit.h>

static CLLocationManager *fqLocationManager = nil;

static CLLocationManager *FQManager(void) {
    if (fqLocationManager == nil) {
        fqLocationManager = [[CLLocationManager alloc] init];
    }
    return fqLocationManager;
}

extern "C" {

int FQ_LocationStatus(void) {
    CLLocationManager *manager = FQManager();
    switch (manager.authorizationStatus) {
        case kCLAuthorizationStatusNotDetermined: return 0;
        case kCLAuthorizationStatusRestricted: return 4;
        case kCLAuthorizationStatusDenied: return 3;
        case kCLAuthorizationStatusAuthorizedAlways:
        case kCLAuthorizationStatusAuthorizedWhenInUse:
            return manager.accuracyAuthorization == CLAccuracyAuthorizationReducedAccuracy ? 2 : 1;
    }
    return 0;
}

void FQ_RequestLocation(void) {
    // When In Use فقط — ما فيه requestAlwaysAuthorization أبدًا (MVP_SCOPE: لا Background Location).
    [FQManager() requestWhenInUseAuthorization];
}

int FQ_CameraStatus(void) {
    switch ([AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo]) {
        case AVAuthorizationStatusNotDetermined: return 0;
        case AVAuthorizationStatusRestricted: return 4;
        case AVAuthorizationStatusDenied: return 3;
        case AVAuthorizationStatusAuthorized: return 1;
    }
    return 0;
}

void FQ_RequestCamera(void) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {}];
}

void FQ_OpenSettings(void) {
    NSURL *url = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
    dispatch_async(dispatch_get_main_queue(), ^{
        [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
    });
}

}
