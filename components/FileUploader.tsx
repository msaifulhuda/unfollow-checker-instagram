"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { findUnfollowers } from "../utils/compareFollowers";
import { exportToCSV } from "../utils/exportCSV";
import { Dialog } from "@headlessui/react";

interface InstagramUser {
  string_list_data: {
    value: string;
    timestamp: number;
  }[];
}

export default function FileUploader() {
  const [unfollowers, setUnfollowers] = useState<string[]>([]);
  const [filteredUnfollowers, setFilteredUnfollowers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [percentage, setPercentage] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError("");
    setIsLoading(true);

    if (acceptedFiles.length !== 2) {
      setError("⚠️ Harus upload 2 file: followers.json & following.json!");
      setIsLoading(false);
      return;
    }

    let followersData: InstagramUser[] = [];
    let followingData: InstagramUser[] = [];

    for (const file of acceptedFiles) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!Array.isArray(json) && !json.relationships_following) {
          setError(`⚠️ File ${file.name} tidak sesuai format Instagram JSON!`);
          setIsLoading(false);
          return;
        }

        if (file.name.includes("followers")) {
          followersData = json;
        } else if (file.name.includes("following")) {
          followingData = json.relationships_following || json; // fallback kalau langsung array
        }
      } catch {
        setError(`⚠️ Gagal baca file ${file.name}`);
        setIsLoading(false);
        return;
      }
    }

    const { unfollowers, totalFollowing } = findUnfollowers(followersData, followingData);
    setUnfollowers(unfollowers);
    setFilteredUnfollowers(unfollowers);

    const percent = (unfollowers.length / totalFollowing) * 100;
    setPercentage(percent);

    setIsLoading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    multiple: true,
  });

  const handleExportCSV = () => {
    exportToCSV(filteredUnfollowers, "unfollowers.csv");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredUnfollowers(unfollowers);
    } else {
      setFilteredUnfollowers(
        unfollowers.filter((user) =>
          user.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
    setCurrentPage(1); // Reset to the first page after search
  };

  const totalPages = Math.ceil(filteredUnfollowers.length / itemsPerPage);
  const paginatedUnfollowers = filteredUnfollowers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">🔍 Cek Unfollowers Instagram</h1>

      <div className="flex flex-col gap-4 mb-6">
        <button
          onClick={() => setIsTutorialOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm md:text-base"
        >
          ❓ Cara Mendapatkan File JSON
        </button>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed p-8 rounded-xl cursor-pointer transition ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-600 text-sm md:text-base">Lepaskan file di sini ...</p>
          ) : (
            <p className="text-gray-600 text-sm md:text-base">
              Drag & drop 2 file JSON di sini, atau klik untuk memilih file
            </p>
          )}
        </div>

        {error && <p className="mt-2 text-red-500 text-sm md:text-base">{error}</p>}
        {isLoading && <p className="mt-2 text-blue-500 text-sm md:text-base animate-pulse">⏳ Sedang memproses...</p>}
      </div>

      {unfollowers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Mereka yang tidak follow kamu:</h2>
          <p className="mb-4 text-gray-600">
            Unfollowers: <span className="font-bold">{unfollowers.length}</span> ({percentage.toFixed(2)}%)
          </p>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mb-6"
          >
            Download CSV 📄
          </button>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari username..."
            className="mb-4 px-4 py-2 border rounded-lg w-full"
          />

          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-gray-800">
                  <th className="border border-gray-300 px-4 py-2">No</th>
                  <th className="border border-gray-300 px-4 py-2">Username</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUnfollowers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-gray-800 hover:text-white transition-colors duration-200">
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            <div className="flex justify-center items-center mt-4 space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${currentPage === 1 ? "bg-gray-800 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Previous
            </button>

            {/* Condensed Page Numbers */}
            {totalPages <= 5 ? (
              Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg ${currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {page}
              </button>
              ))
            ) : (
              <>
              {currentPage > 2 && (
                <>
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`px-3 py-2 rounded-lg ${currentPage === 1
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  1
                </button>
                {currentPage > 3 && <span className="px-2">...</span>}
                </>
              )}

              {Array.from({ length: 3 }, (_, index) => currentPage - 1 + index)
                .filter((page) => page > 0 && page <= totalPages)
                .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${currentPage === page
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {page}
                </button>
                ))}

              {currentPage < totalPages - 2 && (
                <>
                {currentPage < totalPages - 2 && <span className="px-2">...</span>}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-2 rounded-lg ${currentPage === totalPages
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {totalPages}
                </button>
                </>
              )}
              </>
            )}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? "bg-gray-800 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Next
            </button>
            </div>
        </div>
      )}

      {/* Info Modal */}
      <Dialog open={isInfoOpen} onClose={() => setIsInfoOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-gray-700 p-6 space-y-4">
            <Dialog.Title className="text-white text-xl font-bold">Selamat Datang! 👋</Dialog.Title>
            <p className="text-gray-300 text-sm">
              Website ini membantu kamu cek siapa yang sudah tidak follow kamu. Upload file <strong>followers.json</strong> dan <strong>following.json</strong> dari Instagram kamu.
            </p>
            <button
              onClick={() => setIsInfoOpen(false)}
              className="w-full mt-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Mulai 🚀
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Tutorial Modal */}
      <Dialog open={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-gray-700 p-6 space-y-4">
            <Dialog.Title className="text-lg font-bold text-white">Cara Dapat File JSON Instagram</Dialog.Title>
            <ol className="list-decimal list-inside text-left text-sm space-y-2 text-white">
              <li>Masuk Instagram ➔ Profile ➔ Settings ➔ Your Activity ➔ Download Your Information.</li>
              <li>Pilih format JSON, request data.</li>
              <li>Cek email, download ZIP file-nya.</li>
              <li>Ekstrak ZIP ➔ cari <strong>followers_1.json</strong> dan <strong>following.json</strong>.</li>
              <li>Upload ke sini!</li>
            </ol>
            <button
              onClick={() => setIsTutorialOpen(false)}
              className="w-full mt-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Tutup
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}