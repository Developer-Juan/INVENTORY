import { useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';

export default function ConfirmPassword() {
    const { data, setData, processing, errors, reset, setError, clearErrors } = useForm({
        password: '',
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const handleOnChange = (event) => {
        setData(event.target.name, event.target.value);
    };

    const submit = async (e) => {
        e.preventDefault();

        clearErrors();
        try {
            await axios.post(route('password.confirm'), data);
            router.visit(route('dashboard'));
        } catch (error) {
            const payload = error?.response?.data;
            const fieldErrors = payload?.errors ?? {};
            if (Object.keys(fieldErrors).length > 0) {
                Object.entries(fieldErrors).forEach(([field, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(field, message);
                });
                return;
            }
            setError('password', payload?.message ?? 'No se pudo confirmar el password.');
        }
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                This is a secure area of the application. Please confirm your password before continuing.
            </div>

            <form onSubmit={submit}>
                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        isFocused={true}
                        onChange={handleOnChange}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <PrimaryButton className="ml-4" disabled={processing}>
                        Confirm
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
