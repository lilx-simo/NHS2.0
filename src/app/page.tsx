"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: Replace with real auth
    if (username && password) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-nhs-light-blue">
      {/* NHS Header Bar */}
      <header className="w-full h-[72px] bg-nhs-blue flex items-center px-[66px]">
        <Image
          src="/nhs-logo.png"
          alt="NHS Logo"
          width={71}
          height={50}
          priority
        />
      </header>

      {/* Login Card */}
      <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-[517px] p-[10px]">
        <div className="flex flex-col items-center justify-between bg-nhs-card px-12 pt-[26px] pb-[82px] min-h-[422px]">
          {/* Header */}
          <div className="flex w-full items-center justify-center py-[13px]">
            <div className="flex h-[50px] w-[445px] items-center justify-center rounded-[10px] bg-nhs-blue">
              <h1 className="text-[36px] text-white font-normal">
                User Login
              </h1>
            </div>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center gap-[20px] mt-[20px]"
          >
            {/* Username */}
            <div className="flex items-center justify-center py-[13px]">
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-[48px] w-[244px] rounded-[10px] bg-nhs-light-blue px-4 text-[20px] text-black text-center placeholder:text-black outline-none"
              />
            </div>

            {/* Password */}
            <div className="flex items-center justify-center py-[13px]">
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] w-[229px] rounded-[10px] bg-nhs-light-blue px-4 text-[20px] text-black text-center placeholder:text-black outline-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-center py-[13px]">
              <button
                type="submit"
                className="h-[50px] w-[157px] rounded-[10px] bg-nhs-light-blue text-[20px] text-black cursor-pointer hover:bg-nhs-blue hover:text-white transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
