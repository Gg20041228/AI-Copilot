import { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AuthPage.css";

type AuthValues = {
  email: string;
  password: string;
};

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: AuthValues) => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        message.success("登录成功");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        message.success("注册成功，请登录");
        setIsLogin(true);
      }
    } catch (error: any) {
      message.error(error.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-left" />
      <div className="auth-glow auth-glow-right" />

      <section className="auth-card">
        <div className="auth-head">
          <p className="auth-kicker">AI Interview Copilot</p>
          <h1 className="auth-title">
            {isLogin ? "Welcome Back" : "Create an Account"}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? "登录以继续你的面试练习" : "注册并开始你的AI面试准备"}
          </p>
        </div>

        <div className="auth-switch">
          <button
            type="button"
            className={`auth-switch-btn ${isLogin ? "is-active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-switch-btn ${!isLogin ? "is-active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <Form
          name="auth_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              className="auth-input"
              prefix={<MailOutlined />}
              placeholder="name@example.com"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please enter your password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password
              className="auth-input"
              prefix={<LockOutlined />}
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              className="auth-submit-btn"
              icon={isLogin ? <UserOutlined /> : undefined}
            >
              {isLogin ? "Login" : "Sign Up"}
            </Button>
          </Form.Item>
        </Form>
      </section>
    </main>
  );
};
