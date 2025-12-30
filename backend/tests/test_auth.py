def test_guest_login_without_password(client):
  login_path = client.app.url_path_for("auth_login")
  res = client.post(login_path, json={})
  assert res.status_code == 200
  body = res.json()
  assert body["access_token"]
  assert body["token_type"] == "bearer"
  assert body["expires_in"] > 0


def test_register_then_login_success(client):
  register_path = client.app.url_path_for("auth_register")
  login_path = client.app.url_path_for("auth_login")

  register = client.post(register_path, json={"name": "alice", "password": "p@ssw0rd"})
  assert register.status_code == 201

  login = client.post(login_path, json={"name": "alice", "password": "p@ssw0rd"})
  assert login.status_code == 200
  token = login.json()["access_token"]
  assert token

  # 用 token 访问需认证接口，验证能通过依赖链
  headers = {"Authorization": f"Bearer {token}"}
  best_path = client.app.url_path_for("best_score")
  resp = client.get(best_path, params={"level": "endless"}, headers=headers)
  assert resp.status_code == 200
