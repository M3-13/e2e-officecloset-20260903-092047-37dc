import atexit
import os
import shutil
import tempfile

os.environ.setdefault("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789abcdef")

_db_dir = tempfile.mkdtemp(prefix="officecloset-tests-")
atexit.register(shutil.rmtree, _db_dir, ignore_errors=True)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_db_dir}/test.db")
