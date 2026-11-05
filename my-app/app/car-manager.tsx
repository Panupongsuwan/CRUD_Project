"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Car = {
  id: string;
  plateLetters: string;
  plateNumber: string;
  province: string;
  ownerName: string;
  ownerPhone: string;
  brand: string;
  model: string;
  color: string;
  photoFilename: string | null;
  createdAt: string;
};

type CarForm = Omit<Car, "id" | "photoFilename" | "createdAt">;

const emptyCar: CarForm = {
  plateLetters: "",
  plateNumber: "",
  province: "",
  ownerName: "",
  ownerPhone: "",
  brand: "",
  model: "",
  color: "",
};

type ApiResponse = { error?: string; cars?: Car[] };

export default function CarManager({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => Promise<void>;
}) {
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  async function loadCars(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/cars", {
        signal,
        cache: "no-store",
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load vehicle records.");
      }
      setCars(data.cars ?? []);
      setErrorMessage("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load vehicle records.",
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/cars", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => ({
        response,
        data: (await response.json()) as ApiResponse,
      }))
      .then(({ response, data }) => {
        if (!response.ok) {
          throw new Error(data.error ?? "Could not load vehicle records.");
        }
        setCars(data.cars ?? []);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load vehicle records.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visibleCars = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return cars;
    return cars.filter((car) =>
      [
        car.plateLetters,
        car.plateNumber,
        car.province,
        car.ownerName,
        car.ownerPhone,
        car.brand,
        car.model,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [cars, search]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function clearPhotoPreview() {
    setPhotoPreview(null);
  }

  function openCreateForm() {
    setEditingCar(null);
    setPhotoFile(null);
    clearPhotoPreview();
    setRemovePhoto(false);
    setErrorMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(car: Car) {
    setEditingCar(car);
    setPhotoFile(null);
    clearPhotoPreview();
    setRemovePhoto(false);
    setErrorMessage("");
    setIsFormOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    const formData = new FormData(event.currentTarget);
    formData.set("removePhoto", removePhoto ? "true" : "false");

    try {
      const response = await fetch(
        editingCar ? `/api/cars/${editingCar.id}` : "/api/cars",
        {
          method: editingCar ? "PATCH" : "POST",
          body: formData,
        },
      );
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Could not save this vehicle.");
        return;
      }

      setIsFormOpen(false);
      setEditingCar(null);
      setPhotoFile(null);
      clearPhotoPreview();
      await loadCars();
    } catch {
      setErrorMessage("Could not connect to the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(car: Car) {
    if (
      !window.confirm(
        `Delete ${car.plateLetters} ${car.plateNumber} (${car.province})?`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    try {
      const response = await fetch(`/api/cars/${car.id}`, { method: "DELETE" });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Could not delete this vehicle.");
        return;
      }
      setCars((current) => current.filter((item) => item.id !== car.id));
    } catch {
      setErrorMessage("Could not connect to the server. Please try again.");
    }
  }

  async function handleLogout() {
    setErrorMessage("");
    try {
      await onLogout();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not log out.",
      );
    }
  }

  const formCar = editingCar ?? emptyCar;
  const currentPhotoUrl = editingCar?.photoFilename
    ? `/api/cars/${editingCar.id}/photo`
    : null;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Vehicle records
            </h1>
            <p className="text-sm text-slate-500">{email}</p>
          </div>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            type="button"
            onClick={() => void handleLogout()}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Car and owner details
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {cars.length} {cars.length === 1 ? "record" : "records"}
            </p>
          </div>
          <button
            className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            type="button"
            onClick={openCreateForm}
          >
            Add vehicle
          </button>
        </div>

        <label className="mb-5 block max-w-md">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Search plate, owner, or vehicle
          </span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Type to search"
          />
        </label>

        {errorMessage && !isFormOpen && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="py-12 text-center text-slate-600" role="status">
            Loading vehicle records...
          </p>
        ) : visibleCars.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium text-slate-800">
              {cars.length === 0 ? "No vehicles yet" : "No matching vehicles"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {cars.length === 0
                ? "Add a vehicle to get started."
                : "Try another search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCars.map((car) => (
              <article
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                key={car.id}
              >
                {car.photoFilename ? (
                  <Image
                    className="h-48 w-full object-cover"
                    src={`/api/cars/${car.id}/photo`}
                    width={480}
                    height={320}
                    unoptimized
                    alt={`Vehicle ${car.plateLetters} ${car.plateNumber}`}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-200 text-sm text-slate-500">
                    No car photo
                  </div>
                )}
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {car.plateLetters} {car.plateNumber}
                      </p>
                      <p className="text-sm text-slate-500">{car.province}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {car.color}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">
                    {car.brand} {car.model}
                  </p>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="font-medium text-slate-900">{car.ownerName}</p>
                    <a
                      className="text-sm text-blue-700 underline"
                      href={`tel:${car.ownerPhone}`}
                    >
                      {car.ownerPhone}
                    </a>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                      type="button"
                      onClick={() => openEditForm(car)}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      type="button"
                      onClick={() => void handleDelete(car)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsFormOpen(false);
            }
          }}
        >
          <section
            className="my-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-form-title"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold" id="car-form-title">
                {editingCar ? "Edit vehicle" : "Add vehicle"}
              </h2>
              <button
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
                aria-label="Close form"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
                {errorMessage}
              </p>
            )}

            <form
              key={editingCar?.id ?? "new"}
              className="space-y-5"
              onSubmit={handleSave}
            >
              <fieldset>
                <legend className="mb-3 font-medium text-slate-800">
                  License plate
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Letters
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="plateLetters"
                      defaultValue={formCar.plateLetters}
                      maxLength={20}
                      required
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Numbers
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="plateNumber"
                      defaultValue={formCar.plateNumber}
                      inputMode="numeric"
                      pattern="[0-9]{1,4}"
                      maxLength={4}
                      required
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Province
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="province"
                      defaultValue={formCar.province}
                      maxLength={100}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 font-medium text-slate-800">
                  Owner details
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Owner name
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="ownerName"
                      defaultValue={formCar.ownerName}
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Phone number
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="ownerPhone"
                      type="tel"
                      autoComplete="tel"
                      defaultValue={formCar.ownerPhone}
                      maxLength={30}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 font-medium text-slate-800">
                  Vehicle details
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Brand
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="brand"
                      defaultValue={formCar.brand}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Model
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="model"
                      defaultValue={formCar.model}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-sm text-slate-600">
                      Color
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      name="color"
                      defaultValue={formCar.color}
                      maxLength={50}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 font-medium text-slate-800">
                  Car photo
                </legend>
                <input
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2"
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPhotoFile(file);
                    setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    setRemovePhoto(false);
                  }}
                />
                <p className="mt-1 text-xs text-slate-500">
                  JPEG, PNG, or WebP; maximum 5 MB.
                </p>
                {(photoPreview || currentPhotoUrl) && (
                  <Image
                    className="mt-3 h-36 w-56 rounded-md object-cover"
                    src={photoPreview ?? currentPhotoUrl!}
                    width={224}
                    height={144}
                    unoptimized
                    alt="Car photo preview"
                  />
                )}
                {editingCar?.photoFilename && !photoFile && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={removePhoto}
                      onChange={(event) => setRemovePhoto(event.target.checked)}
                    />
                    Remove current photo
                  </label>
                )}
              </fieldset>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save vehicle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
