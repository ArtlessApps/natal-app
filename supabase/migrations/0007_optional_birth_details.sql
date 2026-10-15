-- Birth details (and name) are optional — App Store 5.1.1(v) rejection:
-- "Update the app to not require users to provide Birth Date / Birth Place."
-- A user who skips onboarding gets a profiles row with only id + tz_str
-- (device timezone, for the daily push) and sees the collective sky
-- (POST /daily/sky) until they add details. The other birth columns
-- (birth_time, birth_place_label, lat, lng, chart_json) were already nullable.
alter table profiles alter column name drop not null;
alter table profiles alter column birth_date drop not null;
