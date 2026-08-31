# Suat an benh vien - Huong dan setup ban dau cho IT

Tai lieu nay danh cho bo phan CNTT benh vien khi trien khai ban dau he thong "Suat an benh vien" tren server rieng cua don vi.

Tai lieu khong chua secret that, khong yeu cau xoa database, va khong su dung cac lenh gay mat du lieu nhu `prisma migrate reset` hoac `prisma db push --accept-data-loss`.

## 1. Tong quan mo hinh trien khai

He thong duoc trien khai nhu mot ung dung web tap trung:

- Nguoi dung truy cap bang trinh duyet tren may tinh hoac dien thoai.
- Ung dung chay bang Next.js trong container Docker.
- Du lieu nghiep vu luu trong PostgreSQL.
- File upload nhu anh bang chung, hoa don/chung tu luu trong volume persistent.
- Prisma migration duoc chay bang service `migrate` rieng.
- Worker dong bo du lieu dinh duong chay bang service `data_sync_worker` neu duoc cau hinh.

Khuyen nghi trien khai sau reverse proxy co HTTPS neu mo ra Internet hoac mang WAN.

## 2. Yeu cau server

Khuyen nghi toi thieu cho demo/benh vien nho:

- Ubuntu Server 22.04 LTS hoac 24.04 LTS.
- CPU 2 core tro len.
- RAM 4 GB tro len.
- Disk 40 GB tro len.
- Co quyen SSH quan tri.
- Mo port can thiet cho HTTP/HTTPS hoac port noi bo theo chinh sach benh vien.

Moi truong production nen co:

- backup database dinh ky;
- backup volume upload;
- giam sat dung luong dia;
- HTTPS hop le;
- tai khoan admin rieng, khong dung chung mat khau.

## 3. Cai dat phan mem can thiet

Can co:

- Git
- Docker
- Docker Compose plugin

Kiem tra:

```bash
git --version
docker --version
docker compose version
```

Neu server nam sau proxy cua benh vien, can cau hinh proxy cho Docker va npm truoc khi build.

## 4. Chuan bi domain va Public URL

Can thong nhat domain noi bo hoac public, vi du:

```text
https://suatan.benhvien-a.vn
```

Public URL nay duoc dung cho:

- trang cong khai cho nguoi benh/nguoi nha;
- QR truy cap trang cong khai;
- lien ket chia se noi bo.

Khong hard-code domain cua nha phat trien vao QR cua benh vien. QR khi trien khai that phai tro ve domain chinh thuc cua benh vien hoac public page rieng cua khoa neu duoc cau hinh.

## 5. Lay source code

```bash
cd /opt
git clone <REPO_URL> bao-an-benh-vien-mien-phi
cd /opt/bao-an-benh-vien-mien-phi
git switch main
git pull --ff-only origin main
```

Thay `<REPO_URL>` bang URL repository duoc ban giao.

## 6. Chuan bi file .env

Tao file `.env` tu mau neu repo co san:

```bash
cp .env.example .env
```

Can cau hinh toi thieu:

- `DATABASE_URL`
- thong tin PostgreSQL;
- `APP_SECRET`;
- `BOOTSTRAP_SETUP_TOKEN` la ma khoi tao server de mo cong `/thiet-lap-ban-dau`;
- tai khoan admin khoi tao neu he thong yeu cau;
- salt/cau hinh bao mat neu co;
- cau hinh upload/storage neu repo su dung bien moi truong rieng.

Luu y:

- Khong commit `.env`.
- Khong gui secret qua anh chup man hinh.
- Trong Docker Compose, `DATABASE_URL` thuong dung host `db`, khong dung `localhost`.
- `BOOTSTRAP_SETUP_TOKEN` khac voi `BOOTSTRAP_ADMIN_PASSWORD`.
- Man hinh "Ma khoi tao server" can nhap `BOOTSTRAP_SETUP_TOKEN`.
- Buoc "Xac nhan Admin dau tien" moi dung `BOOTSTRAP_ADMIN_EMAIL` va `BOOTSTRAP_ADMIN_PASSWORD`.

Vi du tao nhanh `BOOTSTRAP_SETUP_TOKEN`:

```bash
BOOTSTRAP_SETUP_TOKEN=$(openssl rand -hex 24)
echo "BOOTSTRAP_SETUP_TOKEN=$BOOTSTRAP_SETUP_TOKEN" >> .env
```

Neu `.env` da co dong `BOOTSTRAP_SETUP_TOKEN=` nhung dang de trong, cap nhat lai:

```bash
TOKEN=$(openssl rand -hex 24)
sed -i "s/^BOOTSTRAP_SETUP_TOKEN=.*/BOOTSTRAP_SETUP_TOKEN=$TOKEN/" .env
echo "$TOKEN"
docker compose up -d --force-recreate app
```

Sau do copy token vua in ra de nhap vao man hinh `/thiet-lap-ban-dau`.

## 7. Khoi dong database

```bash
docker compose up -d db
docker compose ps
```

Cho den khi database o trang thai healthy/running.

Neu DB chua san sang, migration co the bao loi khong ket noi duoc `db:5432`.

## 8. Build ung dung

```bash
docker compose build migrate app data_sync_worker
```

Neu production server co dung service khac trong compose, giu dung topology thuc te cua server.

Neu gap loi `npm ECONNRESET`, thu lai sau khi mang on dinh hon hoac cau hinh proxy/npm registry theo chinh sach mang cua benh vien.

## 9. Apply migration

Chay migration bang service rieng:

```bash
docker compose run --rm migrate
```

Khong chay:

```bash
prisma migrate reset
prisma db push --accept-data-loss
```

Truoc khi apply production, nen doc migration moi de dam bao khong co lenh DROP/DELETE ngoai du kien.

## 10. Chay ung dung

```bash
docker compose up -d app data_sync_worker
```

Neu compose production co service khac bat buoc, chay them theo cau hinh thuc te.

Khong chay seed tren production neu khong co chi dinh ro rang.

## 11. Health check

```bash
curl --retry 20 --retry-connrefused --retry-delay 2 --fail http://localhost:3000/api/health
docker compose ps
```

Ket qua mong muon:

- `/api/health` tra ve thanh cong;
- container `app` dang Up/running;
- database dang running/healthy;
- khong co restart loop.

Xem log khi can:

```bash
docker compose logs --tail=100 app
docker compose logs --tail=100 db
```

## 12. Cau hinh ban dau trong Admin

Sau khi dang nhap Admin lan dau, can cau hinh:

- ten benh vien;
- ten ngan gon;
- logo;
- mau he thong;
- khoa/phong;
- tai khoan nguoi dung;
- vai tro nguoi dung: Quan tri, Dinh duong, Dieu duong, Bep;
- gio chot bao suat;
- gio phuc vu;
- loai bua;
- ma che do an;
- cau hinh NORMAL/SONDE neu benh vien su dung Sonde;
- cau hinh kho neu can;
- Public Base URL neu dung QR/trang cong khai.

Tai khoan cu co ngon ngu mac dinh la Tieng Viet. Nguoi dung co the doi trong Ho so tai khoan.

## 13. Cau hinh QR public

Trong Admin/Settings, cau hinh Public Base URL cua benh vien, vi du:

```text
https://suatan.benhvien-a.vn
```

Sau do moi tao QR.

QR can tro ve:

- trang cong khai chinh thuc cua benh vien; hoac
- public page rieng cua khoa neu he thong da cau hinh token khoa.

Neu chua cau hinh Public Base URL, khong nen tao QR tam.

## 14. Upload va volume persistent

Can dam bao volume upload duoc luu ben vung qua cac lan restart container.

Kiem tra:

```bash
docker compose ps
docker volume ls
```

Neu upload hoa don/anh loi, kiem tra:

- quyen ghi thu muc/volume;
- dung luong dia;
- gioi han upload cua reverse proxy;
- loai file hop le: JPG, PNG, WEBP, PDF;
- dung luong toi da: 10 MB cho hoa don/chung tu.

## 15. Backup co ban

Can backup it nhat:

- PostgreSQL database;
- volume upload;
- file cau hinh `.env` theo kenh bao mat noi bo.

Vi du backup database:

```bash
docker compose exec db pg_dump -U <DB_USER> <DB_NAME> > backup.sql
```

Thay `<DB_USER>` va `<DB_NAME>` bang thong tin that cua he thong. Luu file backup o noi an toan, khong commit vao Git.

## 16. Cap nhat phien ban moi

Quy trinh cap nhat thong thuong:

```bash
cd /opt/bao-an-benh-vien-mien-phi
git fetch origin
git switch main
git pull --ff-only origin main
docker compose build migrate app data_sync_worker
docker compose run --rm migrate
docker compose up -d --force-recreate app data_sync_worker
curl --retry 20 --retry-connrefused --retry-delay 2 --fail http://localhost:3000/api/health
docker compose ps
```

Khong chay seed/reset tren production.

## 17. Rollback an toan co ban

Neu phien ban moi loi, co the rollback code ve commit da biet tot:

```bash
cd /opt/bao-an-benh-vien-mien-phi
git fetch origin
git checkout <GOOD_COMMIT_SHA>
docker compose build app data_sync_worker
docker compose up -d --force-recreate app data_sync_worker
curl --retry 20 --retry-connrefused --retry-delay 2 --fail http://localhost:3000/api/health
```

Luu y:

- Rollback code khong tu dong rollback database.
- Neu migration da thay doi schema, can co ke hoach rollback DB rieng va backup truoc do.
- Khong xoa database de "sua nhanh" tren production.

## 18. Loi thuong gap

### Khong ket noi duoc DB

Dau hieu:

```text
Can't reach database server at db:5432
```

Kiem tra:

```bash
docker compose up -d db
docker compose ps
docker compose logs --tail=100 db
```

Dam bao `DATABASE_URL` dung host `db` khi chay trong Docker Compose.

### Build gap npm ECONNRESET

Day thuong la loi mang/registry.

Huong xu ly:

- chay lai build;
- kiem tra ket noi Internet;
- cau hinh proxy neu server nam trong mang co proxy;
- khong tu dong nang cap npm/package ngoai ke hoach.

### Migration loi

Kiem tra:

```bash
docker compose logs --tail=100 migrate
docker compose run --rm migrate
```

Khong dung migrate reset tren du lieu that.

### App restart loop

Kiem tra:

```bash
docker compose ps
docker compose logs --tail=200 app
```

Hay gap do:

- thieu bien moi truong;
- sai `DATABASE_URL`;
- migration chua apply;
- volume upload khong ghi duoc.

### Upload khong ghi duoc file

Kiem tra:

- volume upload co mount dung khong;
- container app co quyen ghi khong;
- dia con dung luong khong;
- reverse proxy co gioi han body size qua thap khong.

### Domain/HTTPS chua dung

Kiem tra:

- DNS da tro ve server;
- reverse proxy da cau hinh dung host;
- certificate HTTPS con han;
- Public Base URL trong Admin dung domain benh vien.

## 19. Checklist ban giao

Truoc khi ban giao cho benh vien:

- [ ] `/api/health` thanh cong.
- [ ] Admin dang nhap duoc.
- [ ] Da doi mat khau admin khoi tao.
- [ ] Da cau hinh ten/logo/mau benh vien.
- [ ] Da tao khoa/phong.
- [ ] Da tao tai khoan Dieu duong, Dinh duong, Bep.
- [ ] Da cau hinh gio chot va gio phuc vu.
- [ ] Da cau hinh ma che do an.
- [ ] Da test Dieu duong bao suat.
- [ ] Da test Bep xem so luong va ban giao.
- [ ] Da test Khoa xac nhan nhan suat.
- [ ] Da test upload hoa don/chung tu hop le.
- [ ] Da test Phan anh / Ghi chu Bep tren trang public.
- [ ] Da cau hinh Public Base URL truoc khi in QR.
- [ ] Da test QR tren dien thoai.
- [ ] Da kiem tra ngon ngu Tieng Viet / English trong Ho so tai khoan.
- [ ] Da thiet lap backup database va upload volume.
