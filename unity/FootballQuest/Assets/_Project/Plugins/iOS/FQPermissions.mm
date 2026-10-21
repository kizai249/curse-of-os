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

typedef void (*FQLocationCallback)(const char *json);

/// قراءة وحدة عبر requestLocation (When In Use فقط، بدون تتبع مستمر). علامة المحاكاة من iOS 15.
@interface FQLocationDelegate : NSObject <CLLocationManagerDelegate>
@property (nonatomic, assign) FQLocationCallback callback;
@end

@implementation FQLocationDelegate
- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations {
    CLLocation *location = locations.lastObject;
    if (self.callback == NULL || location == nil) return;
    BOOL simulated = NO;
    if (@available(iOS 15.0, *)) {
        simulated = location.sourceInformation.isSimulatedBySoftware;
    }
    NSString *json = [NSString stringWithFormat:@"{\"status\":\"ok\",\"lat\":%.7f,\"lng\":%.7f,\"accuracyM\":%.1f,\"isMock\":%@}",
                      location.coordinate.latitude, location.coordinate.longitude, location.horizontalAccuracy,
                      simulated ? @"true" : @"false"];
    FQLocationCallback cb = self.callback;
    self.callback = NULL;
    cb([json UTF8String]);
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    if (self.callback == NULL) return;
    FQLocationCallback cb = self.callback;
    self.callback = NULL;
    cb("{\"status\":\"error\"}");
}
@end

static FQLocationDelegate *fqDelegate = nil;

extern "C" {

void FQ_ReadLocation(FQLocationCallback callback) {
    CLLocationManager *manager = FQManager();
    if (fqDelegate == nil) fqDelegate = [[FQLocationDelegate alloc] init];
    fqDelegate.callback = callback;
    manager.delegate = fqDelegate;
    manager.desiredAccuracy = kCLLocationAccuracyBest;
    [manager requestLocation];
}

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
